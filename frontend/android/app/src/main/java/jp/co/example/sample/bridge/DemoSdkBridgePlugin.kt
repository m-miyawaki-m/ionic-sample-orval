package jp.co.example.sample.bridge

import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import jp.co.example.demosdk.DemoSdk
import jp.co.example.demosdk.DemoSdkException
import jp.co.example.demosdk.DemoSdkListener

@CapacitorPlugin(name = "DemoSdkBridge")
class DemoSdkBridgePlugin : Plugin() {

    private val errUnknown = "E_UNKNOWN"
    private val errMissingArg = "E_MISSING_ARG"

    @PluginMethod
    fun init(call: PluginCall) {
        val apiKey = call.getString("apiKey")
            ?: return call.reject("apiKey is required", errMissingArg)
        try {
            val ok = DemoSdk.init(apiKey)
            call.resolve(JSObject().put("ok", ok))
        } catch (e: DemoSdkException) {
            call.reject(e.message ?: "init failed", e.code)
        } catch (e: Exception) {
            call.reject(e.message ?: "unknown", errUnknown, e)
        }
    }

    @PluginMethod
    fun getDeviceInfo(call: PluginCall) {
        try {
            val info = DemoSdk.getDeviceInfo()
            val ret = JSObject()
                .put("model", info.model)
                .put("sdkVersion", info.sdkVersion)
            call.resolve(ret)
        } catch (e: DemoSdkException) {
            call.reject(e.message ?: "getDeviceInfo failed", e.code)
        } catch (e: Exception) {
            call.reject(e.message ?: "unknown", errUnknown, e)
        }
    }

    @PluginMethod
    fun echo(call: PluginCall) {
        val text = call.getString("text")
            ?: return call.reject("text is required", errMissingArg)
        try {
            val out = DemoSdk.echo(text)
            call.resolve(JSObject().put("text", out))
        } catch (e: DemoSdkException) {
            call.reject(e.message ?: "echo failed", e.code)
        } catch (e: Exception) {
            call.reject(e.message ?: "unknown", errUnknown, e)
        }
    }

    @PluginMethod
    fun performAction(call: PluginCall) {
        val input = call.getString("input")
            ?: return call.reject("input is required", errMissingArg)
        // Run on a worker thread because performAction sleeps.
        Thread {
            try {
                val out = DemoSdk.performAction(input)
                call.resolve(JSObject().put("output", out))
            } catch (e: DemoSdkException) {
                call.reject(e.message ?: "performAction failed", e.code)
            } catch (e: Exception) {
                call.reject(e.message ?: "unknown", errUnknown, e)
            }
        }.start()
    }

    @PluginMethod
    fun startCounter(call: PluginCall) {
        val interval = call.getLong("intervalMs") ?: 1000L
        try {
            DemoSdk.setListener(object : DemoSdkListener {
                override fun onCountChange(value: Int) {
                    val data = JSObject().put("value", value)
                    notifyListeners("countChange", data)
                }
            })
            DemoSdk.startCounter(interval)
            call.resolve()
        } catch (e: DemoSdkException) {
            call.reject(e.message ?: "startCounter failed", e.code)
        } catch (e: Exception) {
            call.reject(e.message ?: "unknown", errUnknown, e)
        }
    }

    @PluginMethod
    fun stopCounter(call: PluginCall) {
        try {
            DemoSdk.stopCounter()
            DemoSdk.setListener(null)
            call.resolve()
        } catch (e: Exception) {
            call.reject(e.message ?: "unknown", errUnknown, e)
        }
    }

    @PluginMethod
    fun triggerError(call: PluginCall) {
        try {
            DemoSdk.triggerError()
            call.resolve()
        } catch (e: DemoSdkException) {
            call.reject(e.message ?: "triggerError failed", e.code)
        } catch (e: Exception) {
            call.reject(e.message ?: "unknown", errUnknown, e)
        }
    }
}
