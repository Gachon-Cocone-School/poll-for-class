import { env } from "~/env";

interface Member {
  member_name: string;
  member_no: string;
}

export const processBatchMemberText = async (
  text: string,
): Promise<Member[]> => {
  if (!text || text.trim() === "") {
    return [];
  }

  const apiKey = process.env.OPENAI_API_KEY || env.OPENAI_API_KEY;

  if (!apiKey) {
    console.error("OpenAI API key not found");
    throw new Error("OpenAI API key is required for batch member processing");
  }

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "You are a helpful assistant that extracts member names and IDs from text. Format your response as a JSON array of objects with 'member_name' and 'member_no' properties.",
          },
          {
            role: "user",
            content: `Extract member names and ID numbers from this text and format as JSON array of objects with member_name and member_no properties. If ID is missing, use an empty string: ${text}`,
          },
        ],
        temperature: 0.1,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("OpenAI API error response:", errorData);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const result = await response.json();
    const parsedContent = JSON.parse(result.choices[0].message.content);

    // Make sure we have an array of members with the correct properties
    const members = Array.isArray(parsedContent.members)
      ? parsedContent.members
      : Array.isArray(parsedContent)
        ? parsedContent
        : [];

    // Validate each member has the correct properties
    return members.map((member: any) => ({
      member_name: member.member_name || member.name || "",
      member_no: member.member_no || member.id || member.no || "",
    }));
  } catch (error) {
    console.error("Error processing batch member text:", error);
    throw new Error(
      "Failed to process member text. Please check your input and try again.",
    );
  }
};
