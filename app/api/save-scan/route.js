import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabase } from "../../lib/supabase";

// POST { figmaUrl?, fileName?, pageName, result, studentName, frameReviews, finalJudgment, teacherNote }
// figmaUrl is required for Figma scans; fileName is used instead for file-upload scans.
// Called at Step 3 confirmation — first time this scan is written to the database.
export async function POST(request) {
  try {
    const { userId } = await auth();
    const {
      figmaUrl,
      fileName,   // present for upload-mode scans
      pageName,
      result,
      studentName,
      frameReviews,
      finalJudgment,
      teacherNote,
    } = await request.json();

    if (!result || (!figmaUrl && !fileName)) {
      return NextResponse.json({ error: "缺少必要参数" }, { status: 400 });
    }

    // For upload scans, store a synthetic reference so the row is identifiable.
    const storedUrl = figmaUrl || `upload://${fileName}`;

    // Embed teacher's final judgment into the analysis JSONB so it's
    // available in Submissions without adding new columns.
    const analysisWithJudgment = {
      ...result,
      teacherData: {
        finalJudgment: finalJudgment || null,
        teacherNote:   teacherNote   || null,
        savedAt:       new Date().toISOString(),
      },
    };

    const { data, error } = await supabase
      .from("scans")
      .insert({
        user_id:         userId ?? null,
        student_name:    studentName || null,
        figma_url:       storedUrl,
        page_name:       pageName    || null,
        ai_score:        result.overallScore,
        analysis:        analysisWithJudgment,
        teacher_reviews: frameReviews || {},
      })
      .select("id")
      .single();

    if (error) {
      console.error("[save-scan]", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ id: data.id });
  } catch (err) {
    console.error("[save-scan]", err);
    return NextResponse.json({ error: err.message || "保存失败，请重试" }, { status: 500 });
  }
}
