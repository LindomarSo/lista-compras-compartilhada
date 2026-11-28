package com.lindomarso.listajunto;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        registerPlugin(DeviceLocalesPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
