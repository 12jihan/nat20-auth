import { Amplify, ResourcesConfig } from "aws-amplify";
// import { Amplify, ResourcesConfig } from "aws-amplify";
import { signIn, signUp } from "aws-amplify/auth";

const aws_config: ResourcesConfig = {
  Auth: {
    Cognito: {
      userPoolId: 'us-east-1_dKqcnhrFn',
      userPoolClientId: '2u3pvu6f0hmank1885h03od38k',
      signUpVerificationMethod: 'code',
    },
  },
};
Amplify.configure(aws_config);

const header = new Headers({
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
});

interface SignUpBody {
  username: string;
  password: string;
  email: string;
  phone_number: string;
};

interface User {
  id: string;
  username: string;
  password: string;
  email: string;
  first_name: string;
  last_name: string;
  phone_number: string;
};

let response: any = undefined;
let _user_info: any;

export const create_account = async (event) => {
  try {
    if (!event.body) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          message: 'invalid request body' + process.env
        })
      }
    }

    _user_info = JSON.parse(event['body'])['user_info'];
    const user = await signUp({
      username: _user_info.username,
      password: _user_info.password,
      options: {
        userAttributes: {
          email: _user_info.email,
          phone_number: _user_info.phone_number ? _user_info.phone_number : '',
        },
      }
    });

    console.log("response", response);
    return {
      statusCode: 200,
      headers: header,
      body: JSON.parse(event['body'])['user_info'],
      data: user
    };
  } catch (error) {
    console.log("error message:", error);

    return {
      statusCode: 500,
      body: JSON.stringify({
        message: 'Error during sign-up process'
      })
    };
  }
};

// export const login = async (event) => {
//   try {
//     signIn({
//       username: '',
//       password: '',
//     })
//   } catch (e) {

//   }
// }