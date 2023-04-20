package kjd.reactnative.bluetooth.conn;

import android.bluetooth.BluetoothAdapter;
import android.bluetooth.BluetoothServerSocket;
import android.bluetooth.BluetoothSocket;

import java.io.IOException;
import java.util.Properties;
import java.util.UUID;

public class RfcommAcceptorThreadImpl extends ConnectionAcceptor {

    private String mServiceName;
    private boolean mSecure;
    private boolean mCancelled;
    private int mNumAccept;
    private String mRfcomm;
    private BluetoothServerSocket mSocket;

    /**
     * Acceptor threads require the {@link BluetoothAdapter} in order to create the server
     * sockets.
     *
     * @param adapter
     * @param properties
     * @throws IOException
     */
    public RfcommAcceptorThreadImpl(BluetoothAdapter adapter, Properties properties) throws IOException {
        super(adapter, properties);

        this.setName(String.format("%s__Thread", this.getClass().getSimpleName()));

        this.mCancelled = false;
        this.mSecure = StandardOption.SECURE_SOCKET.get(properties);
        this.mServiceName = StandardOption.SERVICE_NAME.get(properties);
        this.mRfcomm = StandardOption.RFCOMM.get(properties);
        this.mNumAccept = 1;

        BluetoothServerSocket tmp = null;
        if (mSecure) {
            tmp = mAdapter.listenUsingRfcommWithServiceRecord(mServiceName,
                    UUID.fromString(mRfcomm));
        } else {
            tmp = mAdapter.listenUsingInsecureRfcommWithServiceRecord(mServiceName,
                    UUID.fromString(mRfcomm));
        }

        mSocket = tmp;
    }

    @Override
    protected BluetoothSocket connect(Properties properties) throws IOException {
        BluetoothSocket[] sockets = new BluetoothSocket[mNumAccept];

        // Keep listening until exception occurs or a socket is returned.
        int accepted = 0;
        while (accepted < mNumAccept) {
            try {
                BluetoothSocket socket = mSocket.accept();

                if (socket != null) {
                    // if we're good set the socket and continue
                    // This will allow for multiple sockets later
                    sockets[accepted++] = socket;
                }
            } catch (IOException e) {
                if (!mCancelled) {
                    disconnect();
                    throw e;
                }
            }
        }

        return sockets[0];
    }

    @Override
    synchronized
    public void cancel() {
        this.mCancelled = true;
        disconnect();
    }

    private void disconnect() {
        try { this.mSocket.close(); } catch(IOException ignored) {}
    }
}
