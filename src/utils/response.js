export const sendSuccess = (res, payload = {}, status = 200) => {
  return res.status(status).json({
    success: true,
    ...payload,
  });
};

export const sendError = (res, message, status = 400, details = null) => {
  return res.status(status).json({
    success: false,
    message,
    ...(details ? { details } : {}),
  });
};
