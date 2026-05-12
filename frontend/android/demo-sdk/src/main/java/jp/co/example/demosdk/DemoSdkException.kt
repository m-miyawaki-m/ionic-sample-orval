package jp.co.example.demosdk

class DemoSdkException(
    val code: String,
    message: String,
) : RuntimeException(message)
