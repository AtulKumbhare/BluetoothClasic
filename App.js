/* eslint-disable react-native/no-inline-styles */
import React, {useEffect, useState} from 'react';
import {
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  TouchableHighlight,
  View,
  ActivityIndicator,
  Image,
  PermissionsAndroid,
  TextInput,
  RefreshControl,
} from 'react-native';

import BluetoothSerial from 'react-native-bluetooth-serial';
import {Buffer} from 'buffer';
global.Buffer = Buffer;
const iconv = require('iconv-lite');
import Container, {Toast} from 'toastify-react-native';
import Geolocation from 'react-native-geolocation-service';

const Button = ({title, onPress, style, textStyle}) => (
  <TouchableOpacity style={[styles.button, style]} onPress={onPress}>
    <Text style={[styles.buttonText, textStyle]}>{title.toUpperCase()}</Text>
  </TouchableOpacity>
);

const DeviceList = ({
  devices,
  connectedId,
  showConnectedIcon,
  onDevicePress,
  isConnected,
  textMsg,
  setTextMsg,
  write,
  getDeviceData,
  refreshing,
}) => (
  <ScrollView
    style={styles.container}
    refreshControl={
      <RefreshControl refreshing={refreshing} onRefresh={getDeviceData} />
    }>
    {isConnected && showConnectedIcon && (
      <View>
        <TextInput
          style={{padding: 10, borderRadius: 6, color: '#7B1FA2'}}
          value={textMsg}
          onChangeText={setTextMsg}
          placeholder="Enter Message"
        />
        <Button
          textStyle={{color: '#FFFFFF'}}
          style={styles.buttonRaised}
          title="Send"
          onPress={() => {
            write(textMsg);
            setTextMsg('');
          }}
        />
      </View>
    )}
    <View style={styles.listContainer}>
      {devices.map((device, i) => {
        return (
          <TouchableHighlight
            underlayColor="#DDDDDD"
            key={`${device.id}_${i}`}
            style={styles.listItem}
            onPress={() => onDevicePress(device, connectedId)}>
            <View style={{flexDirection: 'row'}}>
              {showConnectedIcon ? (
                <View
                  style={{
                    width: 48,
                    height: 48,
                    opacity: 1,
                  }}>
                  {connectedId === device.id && isConnected ? (
                    <Image
                      style={{
                        resizeMode: 'contain',
                        width: 24,
                        height: 24,
                        flex: 1,
                      }}
                      source={require('./images/ic_done_black_24dp.png')}
                    />
                  ) : null}
                </View>
              ) : null}
              <View
                style={{
                  justifyContent: 'space-between',
                  flexDirection: 'row',
                  alignItems: 'center',
                }}>
                <Text style={{fontWeight: 'bold', color: '#7B1FA2'}}>
                  {device?.name}
                </Text>
                <Text
                  style={{
                    color: '#7B1FA2',
                  }}>{`  (${device.id})`}</Text>
              </View>
            </View>
          </TouchableHighlight>
        );
      })}
    </View>
  </ScrollView>
);

const BluetoothSerialExample = () => {
  const [state, setState] = useState({
    isEnabled: false,
    discovering: false,
    devices: [],
    unpairedDevices: [],
    connected: false,
    section: 0,
  });
  const [textMsg, setTextMsg] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const handleLocationPermission = async () => {
    if (Platform.OS === 'android' && Platform.Version >= 23) {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        );
        if (granted === PermissionsAndroid.RESULTS.GRANTED) {
          console.log('Location permission granted');
        } else {
          console.log('Location permission denied');
        }
      } catch (error) {
        console.log('Error requesting location permission:', error);
      }
    }
  };

  const handleBluetoothPermission = async () => {
    if (Platform.OS === 'android' && Platform.Version >= 23) {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
        );
        if (granted === PermissionsAndroid.RESULTS.GRANTED) {
          console.log('Bluetooth Connect permission granted');
        } else {
          console.log('Bluetooth Connect permission denied');
        }
      } catch (error) {
        console.log('Error requesting Bluetooth permission:', error);
      }
    }
  };
  const handleBluetoothScanPermission = async () => {
    if (Platform.OS === 'android' && Platform.Version >= 23) {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
        );
        if (granted === PermissionsAndroid.RESULTS.GRANTED) {
          console.log('Bluetooth scan permission granted');
        } else {
          console.log('Bluetooth scan permission denied');
        }
      } catch (error) {
        console.log('Error requesting Bluetooth permission:', error);
      }
    }
  };

  useEffect(() => {
    BluetoothSerial.isConnected().then(res =>
      setState({...state, isConnected: res}),
    );
    BluetoothSerial.isEnabled().then(res => {
      res ? setState({...state, isEnabled: res}) : enable();
    });
    return () => {
      disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    getDeviceData();

    BluetoothSerial.on('bluetoothEnabled', () =>
      Toast.success('Bluetooth enabled'),
    );
    BluetoothSerial.on('bluetoothDisabled', () =>
      Toast.success('Bluetooth disabled'),
    );
    BluetoothSerial.on('connectionSuccess', () =>
      Toast.success('Bluetooth Connected Successfully'),
    );
    BluetoothSerial.on('error', err => console.log(`Error: ${err?.message}`));
    BluetoothSerial.on('connectionLost', () => {
      if (state.device) {
        Toast.error(`Connection to device ${state.device?.name} has been lost`);
      }
      setState({...state, connected: false});
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  //enable bluetooth on device [android]
  const enable = () => {
    handleLocationPermission();
    handleBluetoothPermission();
    handleBluetoothScanPermission();
    BluetoothSerial.enable()
      .then(res => {
        if (res) {
          BluetoothSerial.list().then(devices => {
            setState({...state, isEnabled: true, devices});
          });
          Geolocation.getCurrentPosition(
            position => {
              console.log(position);
            },
            error => {
              console.log(error.code, error.message);
            },
            {enableHighAccuracy: true, timeout: 15000, maximumAge: 10000},
          );
        }
      })
      .catch(err => Toast.success(err?.message));
  };

  const getDeviceData = () => {
    setRefreshing(true);
    Promise.all([BluetoothSerial.isEnabled(), BluetoothSerial.list()]).then(
      values => {
        const [isEnabled, devices] = values;
        setState({...state, isEnabled, devices});
        setRefreshing(false);
      },
    );
  };

  //disable bluetooth on device [android]
  const disable = () => {
    BluetoothSerial.disable()
      .then(res => setState({...state, isEnabled: false}))
      .catch(err => Toast.success(err?.message));
  };

  //toggle bluetooth [android]
  const toggleBluetooth = value => {
    if (value === true) {
      enable();
    } else {
      disable();
    }
  };

  //Discover unpaired devices, works only in android
  const discoverUnpaired = () => {
    if (state.discovering) {
      return false;
    } else {
      handleBluetoothScanPermission();
      handleBluetoothPermission();
      setState({...state, discovering: true});
      BluetoothSerial.discoverUnpairedDevices()
        .then(unpairedDevices => {
          setState({...state, unpairedDevices, discovering: false});
        })
        .catch(err => {
          Toast.success(err?.message);
        });
    }
  };

  //Discover unpaired devices, works only in android
  const cancelDiscovery = () => {
    if (state.discovering) {
      BluetoothSerial.cancelDiscovery()
        .then(() => {
          setState({...state, discovering: false});
        })
        .catch(err => Toast.success(err?.message));
    }
  };

  //Pair device [android]
  const pairDevice = device => {
    BluetoothSerial.pairDevice(device.id)
      .then(paired => {
        if (paired) {
          Toast.success(`Device ${device?.name} paired successfully`);
          const devices = state.devices;
          devices.push(device);
          setState({
            ...state,
            devices,
            unpairedDevices: state.unpairedDevices.filter(
              d => d.id !== device.id,
            ),
          });
        } else {
          Toast.error(`Device ${device?.name} pairing failed`);
        }
      })
      .catch(err => Toast.error(err?.message));
  };

  //Connect to bluetooth device by id
  const connect = device => {
    setState({...state, connecting: true});
    handleBluetoothPermission();
    BluetoothSerial.connect(device.id)
      .then(res => {
        Toast.success(`Connected to device ${device?.name}`);
        setState({
          ...state,
          device: {...device, connected: true},
          connected: true,
          connecting: false,
        });
      })
      .catch(err => {
        console.log(`Unable to connect to device ${device?.name}`, err);
        // disconnect();
        Toast.error(err?.message);
      });
  };

  //Disconnect from bluetooth device
  const disconnect = () => {
    BluetoothSerial.disconnect()
      .then(() => setState({...state, connected: false}))
      .catch(err => Toast.success(err?.message));
  };

  // Write message to device
  const write = message => {
    if (!state.connected) {
      Toast.error('You must connect to device first');
    }
    BluetoothSerial.write(message)
      .then(res => {
        Toast.success('Successfully wrote to device');
        console.log('res', message);
      })
      .catch(err => Toast.error(err?.message));
  };

  //Read message from device
  const read = () => {
    if (state.connected) {
      BluetoothSerial.readFromDevice()
        .then(data => {
          data && Toast.success(`Received from Kit - ${data}`);
          data && console.log('Initial data read:', data);
        })
        .catch(error => {
          Toast.error(error?.message);
          console.error('Read error:', error);
        });
    }
  };
  setInterval(() => {
    read();
  }, 1000);

  const onDevicePress = (device, connectedId) => {
    if (state.section === 0) {
      state.connected ? disconnect() : connect(device);
    } else {
      pairDevice(device);
    }
  };

  // const writePackets = (message, packetSize = 64) => {
  //   const toWrite = iconv.encode(message, 'cp852');
  //   const writePromises = [];
  //   const packetCount = Math.ceil(toWrite.length / packetSize);

  //   for (var i = 0; i < packetCount; i++) {
  //     const packet = new Buffer(packetSize);
  //     packet.fill(' ');
  //     toWrite.copy(packet, 0, i * packetSize, (i + 1) * packetSize);
  //     writePromises.push(BluetoothSerial.write(packet));
  //   }

  //   Promise.all(writePromises).then(result => {
  //     console.log(result);
  //     Toast.success('Successfully wrote to device');
  //     console.log('res', message);
  //   });
  // };

  const activeTabStyle = {borderBottomWidth: 6, borderColor: '#009688'};
  return (
    <View style={{flex: 1}}>
      <View style={styles.topBar}>
        <Text style={styles.heading}>Bluetooth Classic Integration</Text>
        {Platform.OS === 'android' ? (
          <View style={styles.enableInfoWrapper}>
            <Text style={{fontSize: 12, color: '#FFFFFF'}}>
              {state.isEnabled ? 'Disable' : 'Enable'}
            </Text>
            <Switch onValueChange={toggleBluetooth} value={state.isEnabled} />
          </View>
        ) : null}
      </View>

      {Platform.OS === 'android' ? (
        <View
          style={[
            styles.topBar,
            {justifyContent: 'center', paddingHorizontal: 0},
          ]}>
          <TouchableOpacity
            style={[styles.tab, state.section === 0 && activeTabStyle]}
            onPress={() => setState({...state, section: 0})}>
            <Text style={{fontSize: 14, color: '#FFFFFF'}}>PAIRED DEVICES</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, state.section === 1 && activeTabStyle]}
            onPress={() => setState({...state, section: 1})}>
            <Text style={{fontSize: 14, color: '#FFFFFF'}}>
              UNPAIRED DEVICES
            </Text>
          </TouchableOpacity>
        </View>
      ) : null}
      {state.discovering && state.section === 1 ? (
        <View style={{flex: 1, alignItems: 'center', justifyContent: 'center'}}>
          <ActivityIndicator style={{marginBottom: 15}} size={60} />
          <Button
            textStyle={{color: '#FFFFFF'}}
            style={styles.buttonRaised}
            title="Cancel Discovery"
            onPress={() => cancelDiscovery()}
          />
        </View>
      ) : (
        <DeviceList
          showConnectedIcon={state.section === 0}
          connectedId={state.device && state.device.id}
          devices={state.section === 0 ? state.devices : state.unpairedDevices}
          onDevicePress={device => onDevicePress(device)}
          isConnected={state?.connected}
          textMsg={textMsg}
          setTextMsg={setTextMsg}
          write={write}
          getDeviceData={state.section === 0 ? getDeviceData : discoverUnpaired}
          refreshing={refreshing}
        />
      )}

      <View style={{alignSelf: 'flex-end', height: 52}}>
        <ScrollView horizontal contentContainerStyle={styles.fixedFooter}>
          {Platform.OS === 'android' && state.section === 1 ? (
            <Button
              title={state.discovering ? '... Discovering' : 'Discover devices'}
              onPress={discoverUnpaired}
            />
          ) : null}
          {Platform.OS === 'android' && !state.isEnabled ? (
            <Button title="Request enable" onPress={() => enable()} />
          ) : null}
        </ScrollView>
      </View>

      <Container position="bottom" />
    </View>
  );
};
export default BluetoothSerialExample;
const styles = StyleSheet.create({
  container: {
    flex: 0.9,
    backgroundColor: '#F5FCFF',
  },
  topBar: {
    height: 56,
    paddingHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    elevation: 6,
    backgroundColor: '#7B1FA2',
  },
  heading: {
    fontWeight: 'bold',
    fontSize: 16,
    alignSelf: 'center',
    color: '#FFFFFF',
  },
  enableInfoWrapper: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tab: {
    alignItems: 'center',
    flex: 0.5,
    height: 56,
    justifyContent: 'center',
    borderBottomWidth: 6,
    borderColor: 'transparent',
  },
  connectionInfoWrapper: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 25,
  },
  connectionInfo: {
    fontWeight: 'bold',
    alignSelf: 'center',
    fontSize: 18,
    marginVertical: 10,
    color: '#238923',
  },
  listContainer: {
    borderColor: '#ccc',
    borderTopWidth: 0.5,
  },
  listItem: {
    flex: 1,
    height: 48,
    paddingHorizontal: 16,
    borderColor: '#ccc',
    borderBottomWidth: 0.5,
    justifyContent: 'center',
  },
  fixedFooter: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#ddd',
  },
  button: {
    height: 36,
    margin: 5,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#7B1FA2',
    fontWeight: 'bold',
    fontSize: 14,
  },
  buttonRaised: {
    backgroundColor: '#7B1FA2',
    borderRadius: 2,
    elevation: 2,
  },
});
