import { z } from 'zod';

type ValidationIssue = {
  field: string;
  message: string;
};

type ValidationResult<T extends z.ZodTypeAny> =
  | { success: true; data: z.infer<T> }
  | { success: false; response: Response };

export async function validateRequestBody<T extends z.ZodTypeAny>(
  request: Pick<Request, 'json'>,
  schema: T
): Promise<ValidationResult<T>> {
  let body: unknown;

  try {
    body = await request.json();
  } catch (error) {
    if (!(error instanceof SyntaxError)) throw error;

    return {
      success: false,
      response: validationErrorResponse([
        { field: '', message: 'El cuerpo debe contener JSON válido.' },
      ]),
    };
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return {
      success: false,
      response: validationErrorResponse(
        parsed.error.issues.map((issue) => ({
          field: issue.path.map(String).join('.'),
          message: issue.message,
        }))
      ),
    };
  }

  return { success: true, data: parsed.data };
}

function validationErrorResponse(details: ValidationIssue[]) {
  return new Response(
    JSON.stringify({ error: 'Los datos enviados no son válidos.', details }),
    {
      status: 400,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    }
  );
}
