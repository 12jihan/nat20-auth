export const create_account = async (event) => {
  const response = {
    statusCode: 200,
    body: JSON.stringify({
      event: event,
      test_message: "test message",
    }),
  };

  console.log("testing everythin here");

  return response;
};