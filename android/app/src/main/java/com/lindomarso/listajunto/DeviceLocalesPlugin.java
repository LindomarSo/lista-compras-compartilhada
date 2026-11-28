package com.lindomarso.listajunto;

import android.content.res.Resources;
import android.os.LocaleList;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "DeviceLocales")
public class DeviceLocalesPlugin extends Plugin {
    @PluginMethod
    public void getLocales(PluginCall call) {
        LocaleList systemLocales = Resources.getSystem().getConfiguration().getLocales();
        JSArray tags = new JSArray();
        for (int index = 0; index < systemLocales.size(); index++) {
            tags.put(systemLocales.get(index).toLanguageTag());
        }
        JSObject result = new JSObject();
        result.put("locales", tags);
        call.resolve(result);
    }
}
