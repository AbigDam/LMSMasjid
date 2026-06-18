


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
