import { useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import axios from 'axios';

export default function TestBackend() {
  const [output, setOutput] = useState('');

  function log(data) {
    setOutput(JSON.stringify(data, null, 2));
    console.log(data);
  }

  async function testSelectClasses() {
    axios.get("http://127.0.0.1:8000/api/select_classes/", {
      params: {
        teacher_name: "FirstNameLastName"
      }
    })
    .then(res => console.log(res.data))
    .catch(err => console.log(err));
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Backend Test Panel</Text>

      <Pressable style={styles.button} onPress={testSelectClasses}>
        <Text style={styles.buttonText}>Test Select Classes</Text>
      </Pressable>

      <ScrollView style={styles.outputBox}>
        <Text style={styles.outputText}>{output}</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 20,
  },
  button: {
    padding: 12,
    backgroundColor: '#2563eb',
    borderRadius: 8,
    marginBottom: 10,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    textAlign: 'center',
  },
  outputBox: {
    marginTop: 20,
    backgroundColor: '#111',
    padding: 10,
    borderRadius: 8,
  },
  outputText: {
    color: '#0f0',
    fontSize: 12,
  },
});


      /* 
      //Example Register Call

      axios.post('http://127.0.0.1:8000/api/register/', {
        first_name: "FirstName",
        last_name: "LastName",
        email: "email@example.com",
        password: "examplePass",
        role: "Teacher"
      })
      .then(res => console.log(res.data))
      .catch(err => console.log(err));
      Username is automatically set as first_name + last_name with no spaces
      */
    
      /*
      Example use of Log-in Tokens
      let accessToken = "";

      //Example Login Call 
      axios.post("http://127.0.0.1:8000/api/login/", {
        username: "FirstNameLastName",
        password: "examplePass"
      })
      .then(res => {
        console.log(res.data)
        accessToken = res.data.access;

        //Example Create Class Call
        axios.post(
        "http://127.0.0.1:8000/api/create_class/",
        {
          class_name: "class1"
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`
          }
        }
      )
      .then(res => console.log(res.data))
      .catch(err => console.log(err));

      })
      .catch(err => console.log(err));
      */
