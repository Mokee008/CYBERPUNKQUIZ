export function validateBody(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: result.error.errors.map(e => e.message).join('; '),
          details: result.error.errors
        }
      });
    }
    req.body = result.data;
    next();
  };
}

export function validateParams(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.params);
    if (!result.success) {
      return res.status(400).json({
        error: {
          code: 'INVALID_PARAMETERS',
          message: result.error.errors.map(e => e.message).join('; '),
          details: result.error.errors
        }
      });
    }
    req.params = result.data;
    next();
  };
}
