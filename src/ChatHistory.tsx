import {ReactNode, useEffect, useRef} from "react";
import {Message} from "../server/src/domain/Message.ts";
import {Box, Typography} from "@mui/material";
import {marked} from "marked";
import OpenAI from "openai";
import Model = OpenAI.Model;

export type ChatResponse = {
  messages: Message[];
  speech: string | undefined;
  llm: string | undefined;
  model: Model | undefined;
  lipsync: {
    content_type: string;
    file_name: "string";
    file_size: number,
    videoPath: string;
  } | undefined;
}

/**
 * Converts Markdown to HTML.
 * @param markdown
 */
function mdToHtml(markdown: string | undefined) {
  if (markdown) {
    return marked.parse(markdown);
  } else {
    return "";
  }
}

/**
 * Render a single message bubble based on if it's from system or user.
 *
 * @param m the {@link Message}
 */
function renderMessage(m: Message) {
  const sx = {
    fontFamily: '"Libre Baskerville", serif',
    fontWeight: 400,
    fontStyle: "bold",
    padding: "0.5rem 1rem",
    maxWidth: "max(26rem, 45%)",
    boxShadow: "5px 10px 10px #00000033",
  };
  const user = {
    ...sx,
    alignSelf: "end",
    borderRadius: "1rem 1rem 0 1rem",
    backgroundColor: "rgba(110,18,164,0.8)",
  };
  const system = {
    ...sx,
    backgroundColor: "rgba(44, 58, 58, 0.8)",
    borderRadius: "1rem 1rem 1rem 0",
  }

  if (m.isFromUser) {
    return <Typography sx={user} key={`ch_${m.id}`}>
      {m.content}
    </Typography>;
  } else {
    return <Typography sx={system} key={`ch_${m.id}`}
                       dangerouslySetInnerHTML={{__html: mdToHtml(m.content)}}
    />;
  }
}

export function ChatContainer(props: { messages: Message[] }) {
  // render single item in column-reverse to get automatic scroll-to-bottom
  return <Box id="chCont" sx={{
    fontSize: "small",
    padding: "0 1rem",
    margin: 0,
    width: "100%",
    height: "100%",
    zIndex: 40,
    display: "flex",
    flexDirection: "column-reverse",
    maskImage: "linear-gradient(to bottom, transparent 0%, white 19%)",
    overflow: "scroll"
  }}>
    <ChatHistory messages={props.messages}>.</ChatHistory>
  </Box>;
}

export function ChatHistory({children, messages}: { children: ReactNode, messages: Message[] }) {
  const chatHistory = useRef<HTMLElement | null>(null)
  useEffect(() => {
    if (chatHistory.current) {
      chatHistory.current.scrollIntoView({behavior: "smooth", inline: "end"})
    }
  }, []);
  return <Box ref={chatHistory} sx={{
    display: "flex",
    flexDirection: "column",
    alignItems: "start",
    maxHeight: "18rem",
    paddingTop: "2rem",
    gap: "0.2rem",
    overflow: "scroll"
  }}>
    {messages.map(renderMessage)}
    {children}
  </Box>;
}
