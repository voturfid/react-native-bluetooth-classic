package kjd.reactnative.bluetooth.conn;

import android.bluetooth.BluetoothDevice;
import android.bluetooth.BluetoothSocket;

import java.io.IOException;
import java.lang.reflect.InvocationTargetException;
import java.util.Properties;
import java.util.UUID;

public class RfcommConnectorThreadImpl extends ConnectionConnector {

    private boolean mSecure;
    private String mRfcomm;
    private boolean mCancelled;
    private BluetoothSocket mSocket;

    public RfcommConnectorThreadImpl(BluetoothDevice device, Properties properties) throws IOException {
        super(device, properties);

        this.setName(String.format("%s_%s__Thread", this.getClass().getSimpleName(), device.getAddress()));

        this.mCancelled = false;
        this.mSecure = StandardOption.SECURE_SOCKET.get(properties);
        this.mRfcomm = StandardOption.RFCOMM.get(properties);

        BluetoothSocket tmp = null;

        if (this.mSecure) {
            tmp = device.createRfcommSocketToServiceRecord(UUID.fromString(mRfcomm));
        } else {
            tmp = device.createInsecureRfcommSocketToServiceRecord(UUID.fromString(mRfcomm));
        }

        mSocket = tmp;
    }

    @Override
    protected BluetoothSocket connect(Properties properties) throws IOException {
        // Now we can actually attempt the connection.
        try {
            mSocket.connect();
        } catch (IOException e) {
            try {
                // Some 4.1 devices have problems, try an alternative way to connect
                // See https://github.com/don/RCTBluetoothSerialModule/issues/89
                // I don't know if this is required since Google has updated so that 4.1 devices
                // aren't even supported on the play store
                if (mSecure) {
                    mSocket = (BluetoothSocket)
                            device.getClass().getMethod("createRfcommSocket",
                                    new Class[] {int.class}).invoke(device,1);
                } else {
                    mSocket = (BluetoothSocket)
                            device.getClass().getMethod("createInsecureRfcommSocket",
                                    new Class[] {int.class}).invoke(device,1);
                }

                mSocket.connect();
            } catch (IOException e1) {
                // If the mSocket wasn't closed due to it being mCancelled then rethrow then
                // close the connection and rethrow
                if (!mCancelled) {
                    try { this.mSocket.close(); } catch(IOException ignored) {}
                    throw e1;
                }
            } catch (IllegalAccessException e1) {
                throw new IOException(e);
            } catch (InvocationTargetException e1) {
                throw new IOException(e);
            } catch (NoSuchMethodException e1) {
                throw new IOException(e);
            }
        }

        return mSocket;
    }

    @Override
    synchronized
    protected void cancel() {
        this.mCancelled = true;
        try { this.mSocket.close(); } catch(IOException ignored) {}
    }
}
