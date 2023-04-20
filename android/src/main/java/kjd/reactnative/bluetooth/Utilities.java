package kjd.reactnative.bluetooth;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.ReadableArray;
import com.facebook.react.bridge.ReadableMap;
import com.facebook.react.bridge.ReadableMapKeySetIterator;
import com.facebook.react.bridge.ReadableType;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.bridge.WritableNativeArray;
import com.facebook.react.bridge.WritableNativeMap;

import java.text.DateFormat;
import java.text.ParseException;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Date;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Properties;

/**
 * Random utility classes and variables used for consistency.
 */
public class Utilities {

    public static final String DATE_PATTERN = "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'";

    public static DateFormat dateFormat() {
        return new SimpleDateFormat(DATE_PATTERN, Locale.getDefault());
    }

    public static String formatDate(Date date) {
        return dateFormat().format(date);
    }

    public static Date parseDate(String date) throws ParseException {
        return dateFormat().parse(date);
    }

    public static Properties mapToProperties(ReadableMap readableMap) {
        Map<String, Object> map = recursivelyDeconstructReadableMap(readableMap);
        Properties properties = new Properties();
        for (Map.Entry<String, Object> entry : map.entrySet()) {
            properties.put(entry.getKey(), entry.getValue());
        }
        return properties;
    }

    public static WritableNativeMap makeNativeMap(Map<String, Object> objectMap) {
        WritableNativeMap nativeMap = new WritableNativeMap();

        for (Map.Entry<String, Object> entry : objectMap.entrySet()) {
            String key = entry.getKey();
            Object value = entry.getValue();

            if (value == null) {
                nativeMap.putNull(key);
            } else if (value instanceof Boolean) {
                nativeMap.putBoolean(key, (Boolean) value);
            } else if (value instanceof Double) {
                nativeMap.putDouble(key, (Double) value);
            } else if (value instanceof Integer) {
                nativeMap.putInt(key, (Integer) value);
            } else if (value instanceof String) {
                nativeMap.putString(key, (String) value);
            } else if (value instanceof WritableNativeArray) {
                nativeMap.putArray(key, (WritableNativeArray) value);
            } else if (value instanceof WritableNativeMap) {
                nativeMap.putMap(key, (WritableNativeMap) value);
            } else {
                // Trata outros tipos de objetos aqui, se necessário
            }
        }
        return nativeMap;
    }

    private static Map<String, Object> recursivelyDeconstructReadableMap(ReadableMap readableMap) {
        ReadableMapKeySetIterator iterator = readableMap.keySetIterator();
        Map<String, Object> deconstructedMap = new HashMap<>();
        while (iterator.hasNextKey()) {
            String key = iterator.nextKey();
            ReadableType type = readableMap.getType(key);
            switch (type) {
                case Null:
                    deconstructedMap.put(key, null);
                    break;
                case Boolean:
                    deconstructedMap.put(key, readableMap.getBoolean(key));
                    break;
                case Number:
                    deconstructedMap.put(key, readableMap.getDouble(key));
                    break;
                case String:
                    deconstructedMap.put(key, readableMap.getString(key));
                    break;
                case Map:
                    deconstructedMap.put(key, recursivelyDeconstructReadableMap(readableMap.getMap(key)));
                    break;
                case Array:
                    deconstructedMap.put(key, recursivelyDeconstructReadableArray(readableMap.getArray(key)));
                    break;
                default:
                    throw new IllegalArgumentException("Could not convert object with key: " + key + ".");
            }

        }
        return deconstructedMap;
    }

    private static List<Object> recursivelyDeconstructReadableArray(ReadableArray readableArray) {
        List<Object> deconstructedList = new ArrayList<>(readableArray.size());
        for (int i = 0; i < readableArray.size(); i++) {
            ReadableType indexType = readableArray.getType(i);
            switch(indexType) {
                case Null:
                    deconstructedList.add(i, null);
                    break;
                case Boolean:
                    deconstructedList.add(i, readableArray.getBoolean(i));
                    break;
                case Number:
                    deconstructedList.add(i, readableArray.getDouble(i));
                    break;
                case String:
                    deconstructedList.add(i, readableArray.getString(i));
                    break;
                case Map:
                    deconstructedList.add(i, recursivelyDeconstructReadableMap(readableArray.getMap(i)));
                    break;
                case Array:
                    deconstructedList.add(i, recursivelyDeconstructReadableArray(readableArray.getArray(i)));
                    break;
                default:
                    throw new IllegalArgumentException("Could not convert object at index " + i + ".");
            }
        }
        return deconstructedList;
    }
}

