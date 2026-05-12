package jp.co.example.demosdk

import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertThrows
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit

class DemoSdkTest {

    @Before fun setUp() = DemoSdk.resetForTesting()
    @After fun tearDown() = DemoSdk.resetForTesting()

    @Test
    fun `init with valid apiKey returns true`() {
        assertTrue(DemoSdk.init("dummy-key"))
    }

    @Test
    fun `init with blank apiKey throws E_INVALID_KEY`() {
        val ex = assertThrows(DemoSdkException::class.java) {
            DemoSdk.init("")
        }
        assertEquals("E_INVALID_KEY", ex.code)
    }

    @Test
    fun `getDeviceInfo before init throws E_NOT_INIT`() {
        val ex = assertThrows(DemoSdkException::class.java) {
            DemoSdk.getDeviceInfo()
        }
        assertEquals("E_NOT_INIT", ex.code)
    }

    @Test
    fun `getDeviceInfo after init returns info`() {
        DemoSdk.init("k")
        val info = DemoSdk.getDeviceInfo()
        assertEquals("DemoDevice", info.model)
        assertNotNull(info.sdkVersion)
    }

    @Test
    fun `echo returns input unchanged`() {
        DemoSdk.init("k")
        assertEquals("hello", DemoSdk.echo("hello"))
    }

    @Test
    fun `performAction returns uppercased input`() {
        DemoSdk.init("k")
        assertEquals("HELLO", DemoSdk.performAction("hello"))
    }

    @Test
    fun `triggerError throws E_FAKE`() {
        DemoSdk.init("k")
        val ex = assertThrows(DemoSdkException::class.java) {
            DemoSdk.triggerError()
        }
        assertEquals("E_FAKE", ex.code)
    }

    @Test
    fun `counter fires events at the configured interval`() {
        DemoSdk.init("k")
        val latch = CountDownLatch(3)
        val received = mutableListOf<Int>()
        DemoSdk.setListener(object : DemoSdkListener {
            override fun onCountChange(value: Int) {
                synchronized(received) { received.add(value) }
                latch.countDown()
            }
        })

        DemoSdk.startCounter(50)
        val done = latch.await(2, TimeUnit.SECONDS)
        DemoSdk.stopCounter()

        assertTrue("Expected at least 3 callbacks within 2s", done)
        assertEquals(listOf(1, 2, 3), received.take(3))
    }
}
