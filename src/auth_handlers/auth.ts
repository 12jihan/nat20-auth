import { Amplify, ResourcesConfig } from "aws-amplify";
import { signIn, signUp, SignUpOutput, confirmUserAttribute, confirmSignUp, ConfirmSignUpOutput, deleteUser } from "aws-amplify/auth";
import { Pool } from "pg";
import dotenv from "dotenv";
dotenv.config();

// Interfaces for further custom configuration
interface SignUpBody {
  username: string;
  password: string;
  email: string;
  phone_number: string;
};

interface User {
  id: string;
  username: string;
  password?: string;
  email: string;
  first_name: string;
  last_name: string;
  phone_number: string;
};

// Setting up the lambda
const user_pool_id: string = process.env.USER_POOL_ID!;
const user_pool_client_id: string = process.env.USER_POOL_CLIENT_ID!;
const get_aws_config = (): ResourcesConfig => ({
  Auth: {
    Cognito: {
      userPoolId: user_pool_id,
      userPoolClientId: user_pool_client_id,
      signUpVerificationMethod: 'code',
    },
  },
});

const get_db_pool = () => new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: Number(process.env.DB_PORT),
  ssl: {
    rejectUnauthorized: false
  }
});


export const create_account = async (event) => {
  Amplify.configure(get_aws_config());
  const _pool = get_db_pool();

  try {
    // Checking the body to see if it exists
    if (!event.body) {
      return {
        statusCode: 400,
        message: "Invalid request body"
      };
    };
    // Parse the body for use
    let _user_info = JSON.parse(event['body'])['user_info'];
    // Sign up method
    const sign_up_result: SignUpOutput = await signUp({
      username: _user_info.username,
      password: _user_info.password,
      options: {
        userAttributes: {
          email: _user_info.email,
          phone_number: _user_info.phone_number ? _user_info.phone_number : '',
        },
        autoSignIn: true
      },
    });

    if (!sign_up_result.isSignUpComplete) {
      await deleteUser();
      throw new Error("There was a problem with adding user to the database.");
    }

    const user_data: User = {
      id: sign_up_result['userId']!,
      username: _user_info['username'],
      first_name: _user_info['first_name'],
      last_name: _user_info['first_name'],
      email: _user_info['email'],
      phone_number: _user_info['phone_number']
    };
    await add_user_to_db(_pool, user_data);

    // Return 200 if the user is working properly
    return {
      statusCode: 200,
      body: JSON.stringify(user_data)
    };

  } catch (error) {
    console.error("Error in create_account:", error);

    return {
      statusCode: 500,
      body: JSON.stringify({
        message: 'Error during sign-up process',
        error: error.message
      })
    };
  } finally {
    // When all's said and done it will end the db pool
    await _pool.end();
  }
};

export const confirm_user = (event) => {
  // Confirm the user
  event.response.autoConfirmUser = true;
  // Set the email as verified if it is in the request
  if (Object.hasOwn(event.request.userAttributes, "email")) {
    event.response.autoVerifyEmail = true;
  }

  // Set the phone number as verified if it is in the request
  if (Object.hasOwn(event.request.userAttributes, "phone_number")) {
    event.response.autoVerifyPhone = true;
  }

  console.log("confirm_user", event);
  return event;
};

async function add_user_to_db(pool: Pool, user_data: User) {
  // Setting up the postgres database
  const pool_obj = pool;
  const client = await pool_obj.connect();

  try {
    const _query = `INSERT INTO Nat20.users (
      id,
      username,
      first_name,
      last_name,
      email,
      phone_number,
      date_created,
      date_modified
      ) VALUES($1, $2, $3, $4, $5, $6, $7, $7) RETURNING *`;

    const timestamp = new Date().toISOString();
    const _values = [
      user_data.id,
      user_data.username,
      user_data.first_name,
      user_data.last_name,
      user_data.email,
      user_data.phone_number,
      timestamp
    ];

    const _res = await client.query(_query, _values);
    return _res['rows'][0];

  } catch (error) {
    console.error("Database error:", error);
    if (error.code === '23505') {
      throw new Error("Database error when adding user");
    }
    throw error;
  } finally {
    client.release();
  }
};