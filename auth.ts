export const create_account = async (event) => {
  const response = {
    statusCode: 200,
    body: {
      event: event.body,
      test_message: "test message",
    },
  };

  return response;
};
