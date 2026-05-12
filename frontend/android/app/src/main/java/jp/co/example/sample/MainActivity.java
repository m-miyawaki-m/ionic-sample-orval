package jp.co.example.sample;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

import jp.co.example.sample.bridge.DemoSdkBridgePlugin;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(DemoSdkBridgePlugin.class);
        super.onCreate(savedInstanceState);
    }
}
