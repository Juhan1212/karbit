import { createCommunityPost, getCommunityPosts } from "../database/post";
import { getAuthTokenFromRequest } from "../utils/cookies";
import { validateSession } from "../database/session";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { randomUUID } from "crypto";

export async function action({ request }: { request: Request }) {
  try {
    const token = getAuthTokenFromRequest(request);
    if (!token) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const user = await validateSession(token);
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const formData = await request.formData();
    const title = formData.get("title") as string;
    const content = formData.get("content") as string;
    const category = formData.get("category") as string;
    const tags = formData.getAll("tags");
    const imageFile = formData.get("image");
    const userId = user.id;

    if (!title || !content || !category) {
      return Response.json({ error: "필수 항목 누락" }, { status: 400 });
    }

    let imageUrl: string | undefined = undefined;

    // File 객체인지 확인 (Blob 체크)
    if (imageFile && imageFile instanceof Blob && imageFile.size > 0) {
      console.log(
        "이미지 파일 처리 시작:",
        imageFile.name || "unknown",
        imageFile.size,
        "bytes"
      );

      const arrayBuffer = await imageFile.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // 파일 확장자 추출 (File 객체의 name 속성 사용)
      const originalName = (imageFile as File).name || "image.png";
      const ext = originalName.split(".").pop() || "png";
      const filename = `${randomUUID()}.${ext}`;

      // 저장 경로 설정
      const uploadDir = join(
        process.cwd(),
        "public",
        "uploads",
        "community-posts"
      );
      const filepath = join(uploadDir, filename);

      // 디렉토리 생성 (존재하지 않으면)
      await mkdir(uploadDir, { recursive: true });

      // 파일 저장
      await writeFile(filepath, buffer);
      console.log("이미지 파일 저장 완료:", filepath);

      // URL 경로 설정
      imageUrl = `/uploads/community-posts/${filename}`;
    } else {
      console.log(
        "이미지 파일 없음 또는 잘못된 형식:",
        typeof imageFile,
        imageFile
      );
    }

    const post = await createCommunityPost({
      userId,
      title,
      content,
      category,
      tags: tags as string[],
      imageUrl,
    });
    return Response.json({ post });
  } catch (error) {
    console.error("[community-post] error:", error);
    return new Response(
      JSON.stringify({ error: "서버 오류가 발생했습니다." }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

export async function loader() {
  try {
    const posts = await getCommunityPosts();
    return Response.json({ posts });
  } catch (error) {
    console.error("[community-post] loader error:", error);
    return new Response(
      JSON.stringify({ error: "서버 오류가 발생했습니다." }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
