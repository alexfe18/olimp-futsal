import { NextResponse } from "next/server";

import { sendPushMessage } from "@/lib/server/push-sender";

type SendPushRequest = {
  title?: string;
  body?: string;
  url?: string;
  playerId?: string;
};

const adminSecret = process.env.PUSH_ADMIN_SECRET;

export async function POST(request: Request) {
  try {
    const requestSecret = request.headers.get("x-push-secret");

    if (!adminSecret || requestSecret !== adminSecret) {
      return NextResponse.json(
        {
          success: false,
          message: "Недостатньо прав для відправлення.",
        },
        {
          status: 401,
        },
      );
    }

    const body = (await request.json()) as SendPushRequest;

    const title = body.title?.trim() || "Олімп Футзал";
    const message = body.body?.trim() || "Нове повідомлення від команди.";
    const targetUrl = body.url?.trim() || "/training";
    const playerId = body.playerId?.trim();

    const result = await sendPushMessage({
      title,
      body: message,
      url: targetUrl,
      playerId,
    });

    return NextResponse.json({
      success: true,
      ...result,
      message: result.suppressed
        ? `Push не надіслано (${result.reason}).`
        : `Надіслано сповіщень: ${result.sent}.`,
    });
  } catch (error) {
    console.error("Push send API error:", error);

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Сталася помилка під час відправлення.",
      },
      {
        status: 500,
      },
    );
  }
}
