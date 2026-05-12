package jp.co.example.demosdk

import java.util.Timer
import java.util.TimerTask
import java.util.concurrent.atomic.AtomicBoolean
import java.util.concurrent.atomic.AtomicInteger

data class DeviceInfo(
    val model: String,
    val sdkVersion: String,
)

object DemoSdk {

    private const val SDK_VERSION = "1.0.0-demo"

    private val initialized = AtomicBoolean(false)
    private val counter = AtomicInteger(0)

    @Volatile private var listener: DemoSdkListener? = null
    @Volatile private var timer: Timer? = null

    fun init(apiKey: String): Boolean {
        if (apiKey.isBlank()) {
            throw DemoSdkException("E_INVALID_KEY", "apiKey must not be blank")
        }
        initialized.set(true)
        return true
    }

    fun getDeviceInfo(): DeviceInfo {
        ensureInitialized()
        return DeviceInfo(model = "DemoDevice", sdkVersion = SDK_VERSION)
    }

    fun echo(text: String): String {
        ensureInitialized()
        return text
    }

    /**
     * Pretends to do heavy work. Returns the input uppercased after a delay.
     * The caller is expected to invoke this from a worker thread.
     */
    fun performAction(input: String): String {
        ensureInitialized()
        Thread.sleep(800)
        return input.uppercase()
    }

    fun setListener(listener: DemoSdkListener?) {
        this.listener = listener
    }

    fun startCounter(intervalMs: Long) {
        ensureInitialized()
        stopCounter()
        counter.set(0)
        val t = Timer("DemoSdkCounter", true)
        t.schedule(object : TimerTask() {
            override fun run() {
                val v = counter.incrementAndGet()
                listener?.onCountChange(v)
            }
        }, intervalMs, intervalMs)
        timer = t
    }

    fun stopCounter() {
        timer?.cancel()
        timer = null
    }

    fun triggerError() {
        throw DemoSdkException("E_FAKE", "fake error from DemoSdk")
    }

    private fun ensureInitialized() {
        if (!initialized.get()) {
            throw DemoSdkException("E_NOT_INIT", "DemoSdk is not initialized; call init() first")
        }
    }

    // testing/teardown hook
    internal fun resetForTesting() {
        stopCounter()
        listener = null
        initialized.set(false)
        counter.set(0)
    }
}
