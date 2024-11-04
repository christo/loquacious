import {Box, CircularProgress, styled, TextField, Typography} from "@mui/material";
import {marked} from 'marked';
import OpenAI from "openai";
import React, {KeyboardEventHandler, type MutableRefObject, type ReactNode, useEffect, useRef, useState} from 'react';
import "./App.css";
import {Message} from "../server/src/domain/Message.ts";
import {type ImageInfo} from "../server/src/image/ImageInfo.ts";
import {SystemPanel} from "./SystemPanel.tsx";
import Model = OpenAI.Model;

const DEFAULT_PORTRAIT = 0;
// const BASE_URL_PORTRAIT = "/img/1080x1920";
const BASE_URL_PORTRAIT = "/img/608x800";
const SERVER_PORT = 3001;

type ChatResponse = {
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

function Portrait({src, imgRef, videoRef, videoSrc, hideVideo}: {
    src: string,
    imgRef: MutableRefObject<HTMLImageElement | null>,
    videoRef: MutableRefObject<HTMLVideoElement | null>,
    videoSrc: string | undefined,
    hideVideo: () => void
}) {
    useEffect(() => {
        videoRef.current!.addEventListener('ended', () => {
            hideVideo();
        });
    }, []);
    return <Box sx={{
        marginTop: 0,
        marginLeft: "auto",
        marginRight: "auto",
        objectFit: "cover",
        objectPosition: "top"
    }}>
        <video className="portrait" style={{zIndex: 3, transition: 'none'}} ref={videoRef} src={videoSrc}
               preload="auto"/>
        <img className="portrait" ref={imgRef} alt="portrait" src={src}/>
    </Box>
}

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

function ChatHistory({children, messages}: { children: ReactNode, messages: Message[] }) {
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

type CompResponseProps = {
    response: ChatResponse,
    loading: boolean,
    videoRef: MutableRefObject<HTMLVideoElement | null>,
    hideVideo: () => void;
    showVideo: () => void;
}

function CompResponse({response, videoRef, hideVideo, showVideo}: CompResponseProps) {
    const video = response.lipsync?.videoPath;
    const speech = response.speech;

    // TODO test lipsync and speech without video
    const fetchMedia = (av: "audio" | "video", handleBlob: (blob: Blob) => void) => {
        const url = `//${location.hostname}:${SERVER_PORT}/${av}?file=${video}`;
        fetch(url).then(response => {
            if (!response.ok) {
                throw `network response for ${av} was crap`;
            } else {
                return response.blob();
            }
        }).then(handleBlob).catch(error => {
            console.error('Fetch-o-Error:', error);
        });
    }

    useEffect(() => {
        if (video) {
            fetchMedia("video", blob => {
                videoRef.current!.src = URL.createObjectURL(blob);
                showVideo();
                // noinspection JSIgnoredPromiseFromCall
                videoRef.current!.play();
            });
        } else {
            hideVideo();
            if (speech) {
                // no video, only speech
                fetchMedia("audio", blob => {
                    const audioUrl = URL.createObjectURL(blob);
                    const audio = new Audio(audioUrl);
                    audio.play().catch(reason => {
                        console.error("Audio play failure", reason)
                    });
                });
            } else if (response.llm) {
                // no llm no response at all
                console.log("no speech or video in response");
            }
        }
    }, [response])

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
        <ChatHistory messages={response.messages}>.</ChatHistory>
    </Box>;
}

const ChatInput = styled(TextField)({
    backgroundColor: "black",
    color: "white",
    '& .MuiOutlinedInput-input': {},
    '& .MuiOutlinedInput-root': {
        '& fieldset': {
            backgroundColor: "#333",
            opacity: 0.5,
            border: 'none',  // Remove default border
        },
        '&:hover fieldset': {
            border: 'none',  // Remove border on hover
        },
        '&.Mui-focused fieldset': {
            backgroundColor: "black",
            border: 'none',  // Remove border on focus
        },
    },
});

const App: React.FC = () => {

    const EMPTY_RESPONSE: ChatResponse = {
        messages: [],
        speech: undefined,
        llm: undefined,
        model: undefined,
        lipsync: undefined,
    }

    const [prompt, setPrompt] = useState('');
    const [response, setResponse] = useState<ChatResponse>(EMPTY_RESPONSE);
    const [loading, setLoading] = useState(false);
    const [images, setImages] = useState<ImageInfo[]>([]);
    const inputRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        try {
            fetch(`//${location.hostname}:${SERVER_PORT}/portraits`).then(result => {
                result.json().then(data => {
                    setImages(data || null);
                });
            });
        } catch (e) {
            console.error(e);
        }

    }, []);

    const [imageIndex, setImageIndex] = useState(DEFAULT_PORTRAIT);

    const handleSubmit = async (e: React.KeyboardEvent) => {
        e.preventDefault();
        if (!prompt.trim()) {
            return;
        }
        const anticipatedMessg = new Message(-1, new Date(), prompt, -1, true);
        const anticipatedResponse: ChatResponse = {
            messages: [...response.messages, anticipatedMessg],
            speech: undefined,
            llm: undefined,
            model: undefined,
            lipsync: undefined,
        }
        setResponse(anticipatedResponse);
        setLoading(true);
        setPrompt("");
        const input = inputRef.current?.querySelector('textarea');
        if (input) {
            input.blur();
        }
        try {
            const result = await fetch(`//${location.hostname}:${SERVER_PORT}/api/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    prompt: prompt,
                    portrait: images[imageIndex],
                }),
            });

            const data = await result.json();
            setResponse(data.response || EMPTY_RESPONSE);
        } catch (error) {
            console.error('Error fetching chat response:', error);
            setResponse(EMPTY_RESPONSE);
        } finally {
            setLoading(false);
        }
    };

    const resetResponse = () => {
        setResponse(EMPTY_RESPONSE);
    }

    // submit on enter
    const handleSubmitKey: KeyboardEventHandler<HTMLElement> = async (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault(); // Prevent default Enter behavior (new line)
            await handleSubmit(e); // Submit the form
        }
    };

    const videoRef = useRef<HTMLVideoElement>(null);
    const imgRef = useRef<HTMLImageElement | null>(null);

    const showVideo = () => {
        if (videoRef.current) {
            videoRef.current.style.opacity = "1";
            videoRef.current.style.transition = "none";
        } else {
            hideVideo();
        }
    }
    const hideVideo = () => {
        if (videoRef.current) {
            videoRef.current.style.transition = "opacity: 1.5s ease-in-out";
            videoRef.current.style.opacity = "0";
        }
    }
    const imageUrl = () => `${BASE_URL_PORTRAIT}/${images[imageIndex].f}`;
    return (
        <Box sx={{
            padding: 0,
            display: "flex",
            flexDirection: "row",
            alignItems: "end",
            width: "100dvw",
            height: "100dvh"
        }} component="div">
            {images.length > 0 && (
                <Portrait videoRef={videoRef} imgRef={imgRef} videoSrc={undefined} src={imageUrl()}
                          hideVideo={hideVideo}/>)
            }
            <SystemPanel images={images} setImageIndex={setImageIndex} imageIndex={imageIndex} serverPort={SERVER_PORT}
                         resetResponse={resetResponse}/>
            {loading && <CircularProgress size="2rem" color="secondary"
                                          sx={{
                                              position: "absolute",
                                              zIndex: 500,
                                              top: "2rem",
                                              right: "2rem"
                                          }}/>}
            <Box sx={{
                position: "absolute",
                width: "100%",
                zIndex: 200,
                maxHeight: "36em",
                bottom: 0,
                left: 0,
                overflow: "clip"
            }}>
                <CompResponse response={response} loading={loading} videoRef={videoRef} showVideo={showVideo}
                              hideVideo={hideVideo}/>
                <Box component="form" sx={{
                    position: "sticky",
                    bottom: 0,
                    left: 0,
                    zIndex: 100
                }}>
                    <ChatInput
                        ref={inputRef}
                        hiddenLabel
                        multiline
                        margin="none"
                        value={prompt}
                        maxRows={4}
                        {...{disabled: loading}}
                        fullWidth
                        onKeyDown={handleSubmitKey}
                        onChange={e => setPrompt(e.target.value)}/>
                </Box>
            </Box>
        </Box>
    );
};

export default App;