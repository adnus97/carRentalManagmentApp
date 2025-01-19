// eslint-disable-next-line @eslint-community/eslint-comments/disable-enable-pair
/* eslint-disable @eslint-community/eslint-comments/no-unlimited-disable */
/* eslint-disable @eslint-community/eslint-comments/disable-enable-pair */
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
/* eslint-disable  */
import type { Request, Response } from 'express';
import type { BetterAuthService } from './better-auth/better-auth.service';
import { ReadableStream } from 'stream/web';

export async function toNestJsController(
  authService: BetterAuthService,
  request: Request,
  response: Response,
) {
  // const { toNodeHandler } = await import('better-auth/node');
  // @ts-ignore
  const { setResponse } = await import('better-call');

  function toNodeHandler(handler: any) {
    return async (req: any, res: Response) => {
      const protocol = (req.connection as any)?.encrypted ? 'https' : 'http';
      const base = `${protocol}://${req.headers[':authority'] || req.headers.host}`;
      const response = await handler.handler(
        getRequest({ base, request: req }),
      );

      setResponse(res, response);
    };
  }

  try {
    const authHandler = toNodeHandler(authService.auth);
    return authHandler(request as any, response as any);
  } catch (error) {
    console.log(error);
  }
}

function get_raw_body(req: Request, body_size_limit?: number) {
  const h = req.headers;

  if (!h['content-type']) return null;

  const content_length = Number(h['content-length']);

  // check if no request body
  if (
    (req.httpVersionMajor === 1 &&
      isNaN(content_length) &&
      h['transfer-encoding'] == null) ||
    content_length === 0
  ) {
    return null;
  }

  let length = content_length;

  if (body_size_limit) {
    if (!length) {
      length = body_size_limit;
    } else if (length > body_size_limit) {
      throw Error(
        `Received content-length of ${length}, but only accept up to ${body_size_limit} bytes.`,
      );
    }
  }

  if (req.destroyed) {
    // @ts-ignore
    if (req.body) {
      return new ReadableStream({
        start(controller) {
          // @ts-ignore
          controller.enqueue(Buffer.from(JSON.stringify(req.body)));
          controller.close();
        },
      });
    } else {
      return new ReadableStream({
        start(controller) {
          controller.close();
        },
      });
    }
  }

  let size = 0;
  let cancelled = false;

  return new ReadableStream({
    start(controller) {
      req.on('error', (error) => {
        cancelled = true;
        controller.error(error);
      });

      req.on('end', () => {
        if (cancelled) return;
        controller.close();
      });

      req.on('data', (chunk) => {
        if (cancelled) return;

        size += chunk.length;

        if (size > length) {
          cancelled = true;

          controller.error(
            new Error(
              `request body size exceeded ${
                content_length ? "'content-length'" : 'BODY_SIZE_LIMIT'
              } of ${length}`,
            ),
          );
          return;
        }

        controller.enqueue(chunk);

        if (controller.desiredSize === null || controller.desiredSize <= 0) {
          req.pause();
        }
      });
    },

    pull() {
      req.resume();
    },

    cancel(reason) {
      cancelled = true;
      req.destroy(reason);
    },
  });
}

function getRequest({
  request,
  base,
  bodySizeLimit,
}: {
  base: string;
  bodySizeLimit?: number;
  request: Request;
}) {
  return new Request(base + request.url, {
    duplex: 'half',
    method: request.method,
    body: get_raw_body(request, bodySizeLimit),
    headers: request.headers as Record<string, string>,
  } as unknown as RequestInit);
}
