package com.mobileshell.firewall

import android.net.ConnectivityManager
import android.net.NetworkInterface
import android.net.VpnService
import android.os.Build
import android.os.Process
import io.nekohasekai.libbox.BridgeOptions
import io.nekohasekai.libbox.BridgeSession
import io.nekohasekai.libbox.ConnectionOwner
import io.nekohasekai.libbox.InterfaceUpdateListener
import io.nekohasekai.libbox.Libbox
import io.nekohasekai.libbox.LocalDNSTransport
import io.nekohasekai.libbox.NetworkInterface as LibboxNetworkInterface
import io.nekohasekai.libbox.NetworkInterfaceIterator
import io.nekohasekai.libbox.NeighborUpdateListener
import io.nekohasekai.libbox.PlatformInterface
import io.nekohasekai.libbox.PlatformUser
import io.nekohasekai.libbox.ShellSession
import io.nekohasekai.libbox.TunOptions
import io.nekohasekai.libbox.WIFIState
import io.nekohasekai.libbox.StringIterator
import java.net.InetSocketAddress

/** Android VpnService platform for the real libbox CommandServer. */
internal class LibboxAndroidPlatform(private val service: VpnService, private val packages: List<String>) : PlatformInterface {
    private val connectivity = service.getSystemService(ConnectivityManager::class.java)
    override fun usePlatformAutoDetectInterfaceControl(): Boolean = true
    override fun autoDetectInterfaceControl(fd: Int) { check(service.protect(fd)) { "Не удалось защитить сокет libbox от VPN-петли" } }

    override fun openTun(options: TunOptions): Int {
        check(VpnService.prepare(service) == null) { "Не предоставлено разрешение Android VPN" }
        val mtu = if (options.mtu > 0) options.mtu.coerceIn(576, 65535) else 9000
        val builder = service.Builder().setSession("Mobile Agent — Защита сети").setMtu(mtu)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) builder.setMetered(false)
        addAddresses(builder, options)
        addRoutes(builder, options)
        // Package filtering is intentionally NOT implemented with
        // addAllowedApplication/addDisallowedApplication: those APIs exclude
        // traffic from the VPN and permit a bypass. libbox route.package_name
        // rules enforce the allowlist after all traffic enters the TUN.
        return (builder.establish() ?: error("Android не смог создать TUN-интерфейс")).detachFd()
    }

    private fun addAddresses(builder: VpnService.Builder, options: TunOptions) {
        val ipv4 = options.inet4Address
        while (ipv4.hasNext()) { val prefix = ipv4.next(); builder.addAddress(prefix.address(), prefix.prefix()) }
        val ipv6 = options.inet6Address
        while (ipv6.hasNext()) { val prefix = ipv6.next(); builder.addAddress(prefix.address(), prefix.prefix()) }
    }

    private fun addRoutes(builder: VpnService.Builder, options: TunOptions) {
        if (!options.autoRoute) return
        val dns = options.dnsServerAddress
        while (dns.hasNext()) runCatching { builder.addDnsServer(dns.next()) }
        var hasIpv4 = false
        val ipv4 = options.inet4RouteRange
        while (ipv4.hasNext()) { hasIpv4 = true; val prefix = ipv4.next(); builder.addRoute(prefix.address(), prefix.prefix()) }
        var hasIpv6 = false
        val ipv6 = options.inet6RouteRange
        while (ipv6.hasNext()) { hasIpv6 = true; val prefix = ipv6.next(); builder.addRoute(prefix.address(), prefix.prefix()) }
        if (!hasIpv4 && options.inet4Address.hasNext()) builder.addRoute("0.0.0.0", 0)
        if (!hasIpv6 && options.inet6Address.hasNext()) builder.addRoute("::", 0)
    }

    override fun useProcFS(): Boolean = false
    override fun findConnectionOwner(ipProtocol: Int, sourceAddress: String, sourcePort: Int, destinationAddress: String, destinationPort: Int): ConnectionOwner {
        check(Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) { "Поиск владельца соединения доступен на Android 10+" }
        val uid = connectivity.getConnectionOwnerUid(ipProtocol, InetSocketAddress(sourceAddress, sourcePort), InetSocketAddress(destinationAddress, destinationPort))
        check(uid != Process.INVALID_UID) { "Владелец соединения не найден" }
        val packageNames = service.packageManager.getPackagesForUid(uid)?.toList().orEmpty()
        return ConnectionOwner().apply { userId = uid; userName = packageNames.firstOrNull() ?: ""; setAndroidPackageNames(LibboxStringIterator(packageNames)) }
    }
    override fun startDefaultInterfaceMonitor(listener: InterfaceUpdateListener) = Unit
    override fun closeDefaultInterfaceMonitor(listener: InterfaceUpdateListener) = Unit
    override fun getInterfaces(): NetworkInterfaceIterator {
        val values = NetworkInterface.getNetworkInterfaces().asSequence().mapNotNull { network -> runCatching {
            LibboxNetworkInterface().apply {
                name = network.name; index = network.index; mtu = network.mtu; flags = 0; type = Libbox.InterfaceTypeOther
                addresses = LibboxStringIterator(network.interfaceAddresses.map { "${it.address.hostAddress}/${it.networkPrefixLength}" })
                dnsServer = LibboxStringIterator(emptyList()); metered = false
            }
        }.getOrNull() }.toList()
        return object : NetworkInterfaceIterator { private val iterator = values.iterator(); override fun hasNext() = iterator.hasNext(); override fun next() = iterator.next() }
    }
    override fun underNetworkExtension(): Boolean = false
    override fun includeAllNetworks(): Boolean = false
    override fun clearDNSCache() = Unit
    override fun readWIFIState(): WIFIState? = null
    override fun localDNSTransport(): LocalDNSTransport? = null
    override fun startNeighborMonitor(listener: NeighborUpdateListener) = Unit
    override fun closeNeighborMonitor(listener: NeighborUpdateListener) = Unit
    override fun usePlatformShell(): Boolean = false
    override fun checkPlatformShell() = Unit
    override fun openShellSession(user: PlatformUser, command: String, environ: StringIterator, term: String, rows: Int, cols: Int): ShellSession = error("Shell через libbox отключён в сетевом модуле")
    override fun readSystemSSHHostKey(): String = ""
    override fun lookupSFTPServer(): String = ""
    override fun tailscaleHostname(): String = ""
    override fun usePlatformBridge(): Boolean = false
    override fun createBridge(options: BridgeOptions): BridgeSession = error("Bridge не поддерживается без root")
    override fun lookupUser(username: String): PlatformUser = PlatformUser().apply { this.username = username; uid = Process.myUid(); gid = Process.myUid(); homeDir = service.filesDir.absolutePath; shell = "/system/bin/sh" }
    override fun registerMyInterface(name: String) = Unit
    override fun sendNotification(notification: io.nekohasekai.libbox.Notification) = Unit
}
