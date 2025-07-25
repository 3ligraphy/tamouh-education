import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(request) {
  // Verify API key
  const authHeader = request.headers.get("authorization");

  if (authHeader !== `Bearer ${process.env.API_SECRET_KEY}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get query parameters
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");
  const courseTitle = searchParams.get("courseTitle");

  if (!userId || !courseTitle) {
    return NextResponse.json(
      { error: "Missing required parameters" },
      { status: 400 }
    );
  }

  try {
    const course = await prisma.course.findFirst({
      where: {
        translations: {
          some: {
            courseTitle: courseTitle,
          },
        },
      },
      select: {
        enrolledStudentIds: true,
      },
    });

    const isEnrolled = course?.enrolledStudentIds.includes(userId) ?? false;

    return NextResponse.json({ isEnrolled });
  } catch (error) {
    console.error("Error checking enrollment:", error);

    return NextResponse.json(
      { error: "Failed to check enrollment" },
      { status: 500 }
    );
  }
}
