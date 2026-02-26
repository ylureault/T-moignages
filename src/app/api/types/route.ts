import { NextResponse } from "next/server";
import typesData from "@/data/types.json";

export async function GET() {
  return NextResponse.json({
    success: true,
    count: typesData.length,
    data: typesData,
  });
}
