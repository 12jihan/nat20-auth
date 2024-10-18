import { Amplify, ResourcesConfig } from "aws-amplify";
import { signUp } from "aws-amplify/auth";


const header = new Headers({
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
});

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

export const create_account = async (event) => {
  const _user_info = event;
  console.log("user_info: ", _user_info);
  try {
    const user = await signUp({
      username: _user_info.username,
      password: _user_info.password,
      options: {
        userAttributes: {
          email: _user_info.email,
          // first_name: _user_info.first_name,
          // last_name: _user_info.last_name,
        },
      }
    }).then((data) => {
      
    });

    const response = {
      statusCode: 200,
      headers: header,
      body: event,
      data: user
    };
    // return user;

    return response;
  } catch (error) {

    const response = {
      statusCode: 500,
      headers: header,
      body: event,
      error: error
    };

    return response;
  }
};

function create_body(_event) {
  const _body = JSON.stringify({
    event: _event.body,
  })

  return _body;
}