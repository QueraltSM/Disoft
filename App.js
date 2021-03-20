import React, { Component } from 'react';
import { StyleSheet, TextInput, View, TouchableOpacity, Text, Image, Alert, Linking, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { createAppContainer } from 'react-navigation';
import { createStackNavigator } from 'react-navigation-stack';
import { WebView } from 'react-native-webview';
import AsyncStorage from '@react-native-community/async-storage';
import { BackHandler } from 'react-native';
import axios from 'axios';
import { FlatList } from 'react-native-gesture-handler';

class AccountsScreen extends Component { 

  state = {
    users: [User]
  }

  constructor(props) {
    super(props);
    this.state = {
      users: this.props.navigation.state.params.users
    }  
  } 

  handleBackButton = () => {
    if (this.state.canGoBack) {
      this.webView.ref.goBack();
      return true;
    }
    return true;
  }

  goLogin = () => {
    this.props.navigation.navigate('Login');
  }

  loginUser = (u) => {
    var url = "https://admin.dicloud.es/zonaclientes/loginverifica.asp?company="+u.alias+"&user="+u.user+"&pass="+u.password.toLowerCase()+"&movil=si"
    this.props.navigation.push('Home',{url:url})
  }

  render(){
    return(
      <View style={{flex: 1}}>
        <View style={styles.navBar}>
          <Text style={styles.navBarHeader}>Cuentas registradas</Text>
        </View>
        <FlatList 
        data={ this.state.users.sort((a,b) => a.time > b.time) } 
        renderItem={({ item, index, separators }) => (
          <TouchableOpacity
            key={item.user}
            onPress={() => this.loginUser(item)}>
            <View> 
              <Text style={styles.headerAccounts}>{item.user} {item.date}</Text>
            </View>
          </TouchableOpacity>
        )}
        keyExtractor={(item) => item.user}
        
      />
        <View style={styles.navBar}>
        <Ionicons 
            name="arrow-back" 
            onPress={this.goLogin}
            size={25} 
            color="white"
            style={styles.navBarButton}
          />
        </View>
      </View>
    )
  }
}


class HomeScreen extends Component { 

  WEBVIEW_REF = "disoft"
  alias = ""
  user = ""
  password = ""
  fullname = ""
  token = ""
  webView = {
    canGoBack: false,
    ref: null,
  }
  state = {
    url: ""
  }

  constructor(props) {
    super(props);
    this.state = {
      url: this.props.navigation.state.params.url
    }
    this.setState({url: "https://admin.dicloud.es/zonaclientes/index.asp" })
    this.setWebview()
    //this.getNews()
  } 

  async getUser() {
    await AsyncStorage.getItem("alias").then((value) => {
      this.alias = value;
    })
    await AsyncStorage.getItem("user").then((value) => {
      this.user = value;
    })
    await AsyncStorage.getItem("password").then((value) => {
      this.password = value;
    })
    await AsyncStorage.getItem("token").then((value) => {
      this.token = value;
    })
  }

  /*async getNews() {
    await this.getUser()
    var messages = [Messages]
    const response =await axios.post("https://app.dicloud.es/getPendingNews.asp",{"appSource": "Dicloud", "aliasDb": this.alias, "user":this.user, "password": this.password, "token": this.token})
    response.data.messages.forEach(nx => {
      var n =  {
        from_id: nx.from_id,
        from: nx.from,
        last_messages_timestamp: nx.last_messages_timestamp,
        messages_count: nx.messages_count,
      }
      messages.push(n);
    });
  }*/

  setWebview =  async () => {
    BackHandler.addEventListener('hardwareBackPress', this.handleBackButton);
 }

  handleBackButton = ()=>{
    if (this.state.canGoBack) {
      this.webView.ref.goBack();
      return true;
    }
    return true;
  }

  goIndex = () => {
    this.setState({ url: "https://admin.dicloud.es/zonaclientes/index.asp" })
  }

  reload = () => {
    this.webView.ref.reload();
  }

  saveLogout =  async (state) => {
    await AsyncStorage.setItem('lastUser', "false");
    if (!state) {
      await AsyncStorage.setItem('saveData', "false");
      this.props.navigation.push('Login');
    } else {
      await AsyncStorage.setItem('saveData', "true");
      this.props.navigation.navigate('Login');
    }
  }

  logout = async () => {
    const AsyncAlert = (title, msg) => new Promise((resolve) => {
      Alert.alert(
        "Procedo a desconectar",
        "¿Mantengo tu identificación actual?",
        [
          {
            text: 'Sí',
            onPress: () => {
              resolve(this.saveLogout(true));
            },
          },
          {
            text: 'No',
            onPress: () => {
              resolve(this.saveLogout(false));
            },
          },
          {
            text: 'Cancelar',
            onPress: () => {
              resolve('Cancel');
            },
          },
        ],
        { cancelable: false },
      );
    });
    await AsyncAlert();
  }

  render(){
    return(
      <View style={{flex: 1}}>
        <WebView
          ref={(webView) => { this.webView.ref = webView; }}
          originWhitelist={['*']}
          source={{ uri: this.state.url }}
          startInLoadingState={true}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          setSupportMultipleWindows={false}
          incognito={true}
          allowsBackForwardNavigationGestures
          onNavigationStateChange={(navState) => {
            this.setState({
              canGoBack: navState.canGoBack
            });
          }}
          onError={err => {
            this.setState({ err_code: err.nativeEvent.code })
          }}
          renderLoading={() => 
            <View style={styles.loading}>
            <ActivityIndicator color={'white'} size="large"/>
          </View>}
          renderError={()=> {
            if (this.state.err_code == -2){
              return (
                <View style={{ backgroundColor: "white", flex: 1, height:"100%", width: "100%", position:'absolute', justifyContent: "center", alignItems: "center" }}>
                  <Text>No hay conexión a Internet</Text>
                </View>
              );
            }
          }}
          onShouldStartLoadWithRequest={(event) => {
            if (event.url.indexOf("agententer.asp") > -1) {
              this.logout()
              return false
            } else if (event.url.includes("drive:") || event.url.includes("tel:") || event.url.includes("mailto:") || event.url.includes("maps") || event.url.includes("facebook")) {
              Linking.canOpenURL(event.url).then((value) => {
                if (value) {
                  Linking.openURL(event.url)
                }
              })
              return false
            } else {
              this.setState({ url: event.url })  
              return true
            }
          }}
        />
        <View style={styles.navBar}>
        <Ionicons 
            name="log-out" 
            onPress={this.logout}
            size={25} 
            color="white"
            style={styles.navBarButton}
          />
          <Ionicons 
            name="home" 
            onPress={this.goIndex}
            size={25} 
            color="white"
            style={styles.navBarButton}
          />
          <Ionicons 
            name="reload" 
            onPress={this.reload}
            size={25} 
            color="white"
            style={styles.navBarButton}
          />
        </View>
    </View>
    )
  }
}

class LoginScreen extends Component {  

  users = [User]
  alias = ""
  user = ""
  password = ""
  token = ""
  fullname = ""
  idempresa = ""

  constructor(props) {
    super(props);
    this.state = { hidePassword: true, users: [User] }
  }

  async componentDidMount(){
      const saveData = await AsyncStorage.getItem('saveData').catch(() => {
        saveData = "false";
      });
     if (saveData == "true") {
        await AsyncStorage.getItem("alias").then((value) => {
          this.alias = value;
        })
        this.setState({alias:this.alias})
        await AsyncStorage.getItem("user").then((value) => {
          this.user = value;
        })
        this.setState({user:this.user})
        await AsyncStorage.getItem("password").then((value) => {
          this.pass = value;
        })
        this.setState({pass:this.pass})
        await AsyncStorage.getItem("token").then((value) => {
          this.token = value;
        })
        this.setState({token:this.token})
     }
   }

  showAlert = (message) => {
    Alert.alert(
      "Error",
      message,
      [
        {
          text: "Ok",
          style: "cancel"
        },
      ],
      { cancelable: false }
    );
  }

  handleError = (error_code) => {
    var error = ""
    switch(error_code) {
      case "1":
        error = "Compañía incorrecta"
        break;
      
      case "2":
        error = "Usuario o contraseña incorrectas"
        break;
 
      case "3":
        error = "Este usuario se encuentra desactivado"
        break;
 
      case "4":
        error = "Ha habido algún problema en la comunicación"
        break;
 
      case "5":
        error = "No hay conexión a internet"
        break;

      default:
        error = "Error desconocido"
      }
      this.showAlert(error);
  }

  async goHome() {

    await AsyncStorage.setItem('lastUser', "true");
    await AsyncStorage.setItem('alias', this.alias);
    await AsyncStorage.setItem('user', this.user);
    await AsyncStorage.setItem('password', this.password);
    await AsyncStorage.setItem('fullname', this.fullname);
    await AsyncStorage.setItem('idempresa', this.idempresa + "");
    await AsyncStorage.setItem('token', this.token);

    await AsyncStorage.getItem("users").then((value) => {
      var users = JSON.parse(value)
      if (users != null) {
        var registered = false
        users.forEach(i => {
          if (i != null) {
            var u = i.user 
            if (u == this.user) {
              registered = true
            }
          }
        })
        console.log("registered = " + registered)
        if (!registered) {
          var today = new Date()
          var u = {
            alias:  this.alias,
            user:  this.user,
            password:  this.password,
            token:  this.token,
            time: new Date().getTime(),
            date: ("0" + (today.getDate())).slice(-2)+ "/"+ ("0" + (today.getMonth() + 1)).slice(-2) + "/" + today.getFullYear() + " " + ("0" + (today.getHours())).slice(-2)+ ":" + ("0" + (today.getMinutes())).slice(-2)
          }
          this.users.push(u)
        }
        this.setState({ users: JSON.stringify(this.users)})
      }
    })
    this.setState({ users: JSON.stringify(this.users) })
    await AsyncStorage.setItem('users', this.state.users);

    var url = "https://admin.dicloud.es/zonaclientes/loginverifica.asp?company="+this.alias+"&user="+this.user+"&pass="+this.password.toLowerCase()+"&movil=si"
    this.props.navigation.push('Home',{url:url})
  }

  login = () => {
    this.alias = this.state.alias
    this.user = this.state.user 
    this.password = this.state.pass
    if (this.alias != undefined && this.user != undefined && this.password != undefined) {
      const requestOptions = {
        method: 'POST',
        body: JSON.stringify({aliasDb: this.alias, user: this.user, password: this.password, appSource: "Disoft"})
      };
      fetch('https://app.dicloud.es/login.asp', requestOptions)
        .then((response) => response.json())
        .then((responseJson) => {
          let error = JSON.stringify(responseJson.error_code)
          if (error == 0) {
            this.fullname = JSON.parse(JSON.stringify(responseJson.fullName))
            this.token = JSON.parse(JSON.stringify(responseJson.token))
            this.idempresa = JSON.parse(JSON.stringify(responseJson.idempresa))
            this.goHome()
          } else {
            this.handleError(error)
          }
        }).catch(() => {});
    } else {
      this.showAlert("Complete todos los campos")
    }
  }

  managePasswordVisibility = () => {
    this.setState({ hidePassword: !this.state.hidePassword });
  }

   goAccounts = async () => {
      var accounts = [User]
      var res = await AsyncStorage.getItem('users');
      if (res != null) {
        var users = JSON.parse(res)
        users.forEach(nx => {
          if (nx != null) {
            var u =  {
              alias: nx.alias,
              user: nx.user,
              password: nx.password,
              token: nx.token,
              time: nx.time,
              date: nx.date
            }
            accounts.push(u);
          }
        });
      }
      this.props.navigation.push('Accounts', {users: accounts})
  }
  
  render() {
    return (
      <View style={ styles.container }>
        <Image
          style={{ height: 100, width: 100, margin: 10 }}
          source={require('./assets/main.png')}
        />
        <TextInput  
          style = { styles.textBox }
          placeholder="Compañía"  
          onChangeText={(alias) => this.setState({alias})}  
          value={this.state.alias}
        /> 
        <TextInput  
          style = { styles.textBox }
          placeholder="Usuario"  
          onChangeText={(user) => this.setState({user})}  
          value={this.state.user}
        /> 
        <View style = { styles.textBoxBtnHolder }>
          <TextInput  
            style = { styles.textBox }
            placeholder="Contraseña"
            secureTextEntry = { this.state.hidePassword }
            onChangeText={(pass) => this.setState({pass})}  
            value={this.state.pass}
          />  
          <TouchableOpacity activeOpacity = { 0.8 } style = { styles.visibilityBtn } onPress = { this.managePasswordVisibility }>
              <Ionicons name={ ( this.state.hidePassword ) ? "eye"  : "eye-off" } size={32} color="#98A406" /> 
            </TouchableOpacity>   
        </View>  
        <TouchableOpacity onPress={this.login} style={styles.appButtonContainer}>
          <Text style={styles.appButtonText}>Entrar</Text>
        </TouchableOpacity>  
        <TouchableOpacity onPress={this.goAccounts}>
          <Text>Cuentas registradas</Text>
        </TouchableOpacity>  
        <View style={{alignItems: 'center', justifyContent: 'center', backgroundColor:"#337BB7", flexDirection:'row', textAlignVertical: 'center'}}>
        <Text></Text>
        </View>
      </View>
    );
  } 
}

class MainScreen extends Component {
  constructor(props) {
    super(props);
    this.init()
  }

  init = async () => {
    const lastUser = await AsyncStorage.getItem('lastUser').catch(() => {
      lastUser = "false";
    });
    const alias = await AsyncStorage.getItem('alias').catch(() => {
      alias = "";
    });
    const user = await AsyncStorage.getItem('user').catch(() => {
      user = "";
    });
    const password = await AsyncStorage.getItem('password').catch(() => {
      password = "";
    });
    const token = await AsyncStorage.getItem('token').catch(() => {
      token = "";
    });
    await new Promise(resolve => setTimeout(resolve, 2000));
    if (lastUser == "true") {
      var url = "https://admin.dicloud.es/zonaclientes/?company="+alias+"&user="+user+"&pass="+password.toLowerCase()+"&token="+token
      this.props.navigation.navigate('Home',{url:url})
    } else {
      this.props.navigation.navigate('Login')
    }
  };

  render(){
    return (
      <View style={styles.mainView}>
      <Image source={require('./assets/main.png')}
        style={{ width: 100, height: 100, alignSelf: "center", marginBottom:20 }}
      />
      <Text style={styles.mainHeader}>Disoft</Text>
    </View>
    )
  }
}

export class User {
  constructor(alias, user, password, token, time, date) {
    this.alias = alias;
    this.user = user;
    this.password = password;
    this.token = token;
    this.time = time;
    this.date = date;
  }
}

export class Messages {
  constructor(from_id, from, last_messages_timestamp, messages_count) {
    this.from_id = from_id;
    this.from = from;
    this.last_messages_timestamp = last_messages_timestamp;
    this.messages_count = messages_count;
  }
}

const AppNavigator = createStackNavigator({
  Main: {
    screen: MainScreen,
    navigationOptions: {
      header: null
    }
  },
  Login: {
    screen: LoginScreen,
    navigationOptions: {
      header: null
    }
  },
  Home: {
    screen: HomeScreen,
    navigationOptions: {
      header: null
    }
  },
  Accounts: {
    screen: AccountsScreen,
    navigationOptions: {
      header: null
    }
  },
});

export default createAppContainer(AppNavigator);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textBoxBtnHolder:{
    position: 'relative',
    alignSelf: 'stretch',
    justifyContent: 'center'
  },
  textBox: {
    fontSize: 18,
    alignSelf: 'stretch',
    height: 45,
    paddingLeft: 8,
    color:"#98A406",
    borderWidth: 2,
    paddingVertical: 0,
    borderColor: '#98A406',
    borderRadius: 0,
    margin: 10,
    borderRadius: 20,
    textAlign: "center"
  },
  visibilityBtn:{
    position: 'absolute',
    right: 20,
    height: 40,
    width: 35,
    padding: 2
  },
  date:{
    color: "#98A406",
    backgroundColor: "white"
  },
  appButtonContainer: {
    elevation: 8,
    backgroundColor: "#98A406",
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 12,
    width: 150,
    margin: 20 
  },
  appButtonText: {
    fontSize: 15,
    color: "#fff",
    fontWeight: "bold",
    alignSelf: "center",
    textTransform: "uppercase"
  },
  navBarButton: {
    color: '#FFFFFF',
    textAlign:'center',
    width: 64
  },
  headerAccounts: {
    color: '#196F3D',
    textAlign:'center',
    fontSize: 20
  },
  navBar:{
    flexDirection:'row', 
    textAlignVertical: 'center',
    height: 50,
    alignItems: 'center', 
    justifyContent: 'center', 
    backgroundColor:"#196F3D", 
    flexDirection:'row', 
    textAlignVertical: 'center'
  },
  navBarHeader: {
    flex: 1,
    color: '#FFFFFF',
    fontWeight: 'bold',
    textAlign: 'center',
    fontSize: 20
  },
  loading: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: "#196F3D"
  },
  mainView: {
    backgroundColor:"#196F3D",
    flex: 1,
    justifyContent: 'center',
  },
  mainHeader: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 25,
    alignSelf: "center"
  }
});