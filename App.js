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
import PushNotification from 'react-native-push-notification';
import BackgroundFetch from 'react-native-background-fetch';

class AccountsScreen extends Component { 

  state = {
    users: [User]
  }
  aux_users = []

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

  loginUser = async (u) => {
    var users = this.state.users
    users.forEach(item => {
      if (item.user == u.user) {
        var today = new Date()
        var updatedUser = {
          alias:  item.alias,
          user:  item.user,
          password:  item.password,
          token:  item.token,
          time: new Date().getTime(),
          date: ("0" + (today.getDate())).slice(-2)+ "·"+ ("0" + (today.getMonth() + 1)).slice(-2) + "·" + today.getFullYear() + " " + ("0" + (today.getHours())).slice(-2)+ ":" + ("0" + (today.getMinutes())).slice(-2)
        }
        this.aux_users.push(updatedUser)
      } else {
        this.aux_users.push(item)
      }
    })
    this.setState({ users: this.aux_users })
    await AsyncStorage.setItem("users", JSON.stringify(this.aux_users))
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
        data={ this.state.users.sort((a,b) => a.time < b.time) } 
        renderItem={({ item, index, separators }) => (
          <TouchableOpacity
            key={item.user}
            onPress={() => this.loginUser(item)}>
            <View> 
              <Text style={styles.headerAccounts}>{item.user}</Text>
              <Text style={styles.dateAccounts}>Última vez {item.date}</Text>
            </View>
          </TouchableOpacity>
        )}
        keyExtractor={(item) => item.user}
        
      />
        <View style={styles.navBar}>
        <Ionicons 
            name="log-in-outline" 
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
    url: "",
    messages: [],
    toUser: "",
    news: []
  }
  aux_messages = []
  aux_news = []

  constructor(props) {
    super(props);
    this.state = {
      url: this.props.navigation.state.params.url,
      messages: [],
      toUser: "",
      news: []
    }
    this.setState({url: "https://admin.dicloud.es/zonaclientes/index.asp" })
    this.setWebview()
    this.getUser()
    this.configNotifications()
    this.setBackgroundFetch()
    this.getPendingNews()
    this.getNews()
    setInterval(() => {
      this.getPendingNews()
      this.getNews()
    }, 60000);
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

  async setPendingNews(m){
    this.aux_messages = []
    var notified = false
    var notified_messages = await new AsyncStorage.getItem("messages")
    var messages = JSON.parse(notified_messages)
    if (messages != null) {
      await messages.forEach(x => {
        if (x.begin_date == m.begin_date && x.nombre == m.nombre && x.msg_es == m.msg_es) {
          notified = true
        }
      })
    }
    if (!notified) {
      this.aux_messages = messages
      this.aux_messages.push(m);
      this.setState({ messages: this.aux_messages })
      await new AsyncStorage.setItem("messages", JSON.stringify(this.aux_messages))
      this.pushNotification("Nuevo mensaje de " + m.nombre, m.msg_es)
    }
  }

  async checkPendingNews(u) {
    this.setState({ toUser: u.user })
    const requestOptions = {
      method: 'POST',
      body: JSON.stringify({aliasDb: u.alias, user: u.user, password: u.password, token:u.token, appSource: "Disoft"})
    };
    await fetch('https://app.dicloud.es/getPendingNewsZC.asp', requestOptions)
      .then((response) => response.json())
      .then((responseJson) => {
        var messages = responseJson.messages
        if (messages != null) {
          messages.forEach(nx => {
            var m =  {
              begin_date: nx.begin_date,
              nombre: nx.nombre,
              msg_es: nx.msg_es
            }
            this.setPendingNews(m)
          });
        }
      }).catch(() => {});
  }

  async getPendingNews() {
    await AsyncStorage.getItem("users").then((value) => {
      var users = JSON.parse(value)
      if (users != null) {
        users.forEach(i => {
          if (i != null) {
            var u = {
              alias:  i.alias,
              user:  i.user,
              password:  i.password,
              token:  i.token,
              time: i.time,
              date: i.date
            }
            this.checkPendingNews(u)
          }
        })
      }
    })
  }

  async setNews(m){
    this.aux_news = []
    var notified = false
    var notified_news= await new AsyncStorage.getItem("news")
    var news = JSON.parse(notified_news)
    if (news != null) {
      await news.forEach(x => {
        if (n.news_id == x.news_id && n.subject == x.subject) {
          notified = true
        }
      })
    }
    if (!notified) {
      this.aux_news = news
      this.aux_news.push(m);
      this.setState({ news: this.aux_news })
      await new AsyncStorage.setItem("news", JSON.stringify(this.aux_news))
      this.pushNotification("Noticias y convocatorias" + n.subject)
    }
  }

  async checkNews(u) {
    const requestOptions = {
      method: 'POST',
      body: JSON.stringify({aliasDb: u.alias, user: u.user, password: u.password, token:u.token, appSource: "Disoft"})
    };
    await fetch('https://app.dicloud.es/getNews.asp', requestOptions)
      .then((response) => response.json())
      .then((responseJson) => {
        var news = responseJson.usernews
        if (news != null) {
          news.forEach(nx => {
            var n =  {
              news_id: nx.news_id,
              subject: nx.subject
            }
            this.setNews(n)
          });
        }
      }).catch(() => {});
  }
  
  async getNews() {
    await AsyncStorage.getItem("users").then((value) => {
      var users = JSON.parse(value)
      if (users != null) {
        users.forEach(i => {
          if (i != null) {
            var u = {
              alias:  i.alias,
              user:  i.user,
              password:  i.password,
              token:  i.token,
              time: i.time,
              date: i.date
            }
            this.checkNews(u)
          }
        })
      }
    })
  }

  configNotifications = () => {
    PushNotification.configure({
      onNotification: function(notification) {},
      permissions: {
        alert: true,
        badge: true,
        sound: true,
      },
      requestPermissions: Platform.OS === 'ios',
      popInitialNotification: true,
    });
    PushNotification.createChannel({
      channelId: "channel-id", // (required)
      channelName: "My channel", // (required)
      channelDescription: "A channel to categorise your notifications", // (optional) default: undefined.
      playSound: false, // (optional) default: true
      soundName: "default", // (optional) See `soundName` parameter of `localNotification` function
      importance: 4, // (optional) default: 4. Int value of the Android notification importance
      vibrate: true, // (optional) default: true. Creates the default vibration patten if true.
    },
    (created) => console.log(`createChannel returned '${created}'`) // (optional) callback returns whether the channel was created, false means it already existed.
    );
  }

  pushNotification = (title, message) => {
    PushNotification.localNotification({
      title: title,
      message: message,
      playSound: true,
      soundName: 'default',
      channelId: "channel-id"
    });
  }

  setBackgroundFetch = () => {
    console.log("setBackgroundFetch")
    BackgroundFetch.configure({
      minimumFetchInterval: 15, // fetch interval in minutes
      enableHeadless: true,
      stopOnTerminate: false,
      periodic: true,
    },
    async taskId => {
      this.getPendingNews()
      this.getNews()
      BackgroundFetch.finish(taskId);
    },
    error => {
      console.error('RNBackgroundFetch failed to start.');
      },
    );
  }

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
  aux_users = [User]
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

  createUsers() {
    var today = new Date()
    var u = {
      alias:  this.alias,
      user:  this.user,
      password:  this.password,
      token:  this.token,
      time: new Date().getTime(),
      date: ("0" + (today.getDate())).slice(-2)+ "·"+ ("0" + (today.getMonth() + 1)).slice(-2) + "·" + today.getFullYear() + " " + ("0" + (today.getHours())).slice(-2)+ ":" + ("0" + (today.getMinutes())).slice(-2)
    }
    this.aux_users.push(u)
  }

  async goHome() {
    this.aux_users = [User]
    await AsyncStorage.setItem('lastUser', "true");
    await AsyncStorage.setItem('alias', this.alias);
    await AsyncStorage.setItem('user', this.user);
    await AsyncStorage.setItem('password', this.password);
    await AsyncStorage.setItem('fullname', this.fullname);
    await AsyncStorage.setItem('idempresa', this.idempresa + "");
    await AsyncStorage.setItem('token', this.token);
    await AsyncStorage.getItem("users").then((value) => {
      var users = JSON.parse(value)
      var actualUser = false
      if (users != null) {
        users.forEach(i => {
          if (i != null) {
            var u = {
              alias:  i.alias,
              user:  i.user,
              password:  i.password,
              token:  i.token,
              time: i.time,
              date: i.date
            }
            if (u.user == this.user) {
              actualUser = true
              this.createUsers()
            } else {
              this.aux_users.push(u)
            }
          }
        })
        if (!actualUser) {
          this.createUsers()
        }
      } else {
        this.createUsers()
      }
    })
    this.setState({ users: JSON.stringify(this.aux_users) })
    await AsyncStorage.setItem('users', this.state.users);
    //this.setState({ users: [User] }) // Test: delete all users
    //await AsyncStorage.setItem('users', ""); // Test: delete all users
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
      var accounts = []
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
        this.props.navigation.push('Accounts', {users: accounts})
      } else {
        this.showAlert("No has registado ninguna cuenta")
      }
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
          <Text style={styles.registeredAccounts}>Cuentas registradas</Text>
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
      var url = "https://admin.dicloud.es/zonaclientes/loginverifica.asp?company="+alias+"&user="+user+"&pass="+password.toLowerCase()+"&token="+token+"&movil=si"
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

export class News {
  constructor(news_id, subject) {
    this.news_id = news_id;
    this.subject = subject;
  }
}

export class PendingNews {
  constructor(begin_date, nombre, msg_es) {
    this.begin_date = begin_date;
    this.nombre = nombre;
    this.msg_es = msg_es;
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
    color: '#98A406',
    textAlign:'center',
    fontSize: 20,
    fontWeight: "bold",
    alignSelf: "center",
    paddingTop: 20,
  },
  dateAccounts: {
    color: '#98A406',
    textAlign:'center',
    fontSize: 17,
    alignSelf: "center",
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
  },
  registeredAccounts: {
    color: '#98A406',
    textAlign:'center',
    fontSize: 15,
    fontWeight: "bold",
    alignSelf: "center",
    paddingTop: 20,
  }
});