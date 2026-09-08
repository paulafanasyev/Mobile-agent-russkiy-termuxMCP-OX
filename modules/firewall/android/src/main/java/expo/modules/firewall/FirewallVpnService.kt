package expo.modules.firewall

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Intent
import android.net.VpnService
import android.os.Build
import android.os.IBinder
import android.util.Log
import com.mobileshell.firewall.LibboxForwardingBridge
import org.json.JSONArray
import org.json.JSONObject

/**
 * Android VPN service with a real default-deny libbox route policy.
 * All application traffic is captured by TUN. Allowlisted packages are routed
 * to `direct`; the final route is `block`.
 */
class FirewallVpnService : VpnService() {
    private var bridge: LibboxForwardingBridge? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        startSecurityForeground()
        val packages = intent?.getStringArrayListExtra(EXTRA_PACKAGES)?.toList().orEmpty()
        val mode = intent?.getStringExtra(EXTRA_MODE) ?: "allowlist"
        require(mode == "allowlist") { "Поддерживается только режим default-deny allowlist" }

        val config = createFirewallConfig(packages)
        val newBridge = LibboxForwardingBridge(this, this, emptyList())
        val result = newBridge.start(config)
        if (result.isSuccess()) {
            bridge?.stop()
            bridge = newBridge
            FirewallRuntimeState.set(true, packages)
            return START_STICKY
        }
        result.exceptionOrNull()?.let { Log.e(TAG, "libbox forwarding не запущен", it) }
        newBridge.stop()
        FirewallRuntimeState.set(false, emptyList())
        stopSelf()
        return START_NOT_STICKY
    }

    private fun createFirewallConfig(packages: List<String>): String = JSONObject().apply {
        put("log", JSONObject().apply { put("level", "warn") })
        put("inbounds", JSONArray().put(JSONObject().apply {
            put("type", "tun")
            put("tag", "android-tun")
            put("interface_name", "mobile-agent-tun")
            put("inet4_address", JSONArray().put("172.19.0.1/30"))
            put("auto_route", true)
            put("stack", "system")
        }))
        put("outbounds", JSONArray()
            .put(JSONObject().apply { put("type", "direct"); put("tag", "direct") })
            .put(JSONObject().apply { put("type", "block"); put("tag", "block") }))
        put("route", JSONObject().apply {
            put("auto_detect_interface", true)
            put("rules", JSONArray().apply {
                packages.distinct().filter(String::isNotBlank).forEach { packageName ->
                    put(JSONObject().apply {
                        put("package_name", JSONArray().put(packageName))
                        put("action", JSONObject().apply { put("action", "route"); put("outbound", "direct") })
                    })
                }
            })
            put("final", "block")
        })
    }.toString()

    private fun startSecurityForeground() {
        val channelId = "mobile_agent_firewall"
        val manager = getSystemService(NotificationManager::class.java)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) manager.createNotificationChannel(NotificationChannel(channelId, "Защита сети", NotificationManager.IMPORTANCE_LOW))
        val notification = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            Notification.Builder(this, channelId).setSmallIcon(android.R.drawable.ic_lock_lock).setContentTitle("Mobile Agent — фаервол").setContentText("Default-deny сетевой движок libbox работает").setOngoing(true).build()
        } else {
            @Suppress("DEPRECATION")
            Notification.Builder(this).setSmallIcon(android.R.drawable.ic_lock_lock).setContentTitle("Mobile Agent — фаервол").setContentText("Default-deny сетевой движок libbox работает").setOngoing(true).build()
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) startForeground(NOTIFICATION_ID, notification, android.content.pm.ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE) else startForeground(NOTIFICATION_ID, notification)
    }

    override fun onBind(intent: Intent): IBinder? = super.onBind(intent)
    override fun onDestroy() { bridge?.stop(); bridge = null; FirewallRuntimeState.set(false, emptyList()); super.onDestroy() }
    override fun onRevoke() { stopSelf(); super.onRevoke() }

    companion object {
        private const val TAG = "MobileAgentFirewall"
        const val EXTRA_PACKAGES = "allowed_packages"
        const val EXTRA_MODE = "firewall_mode"
        private const val NOTIFICATION_ID = 27001
    }
}

internal object FirewallRuntimeState {
    @Volatile private var running = false
    @Volatile private var packages: List<String> = emptyList()
    fun set(value: Boolean, rules: List<String>) { running = value; packages = rules.toList() }
    fun isRunning(): Boolean = running
    fun rules(): List<String> = packages.toList()
}
