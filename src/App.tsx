import {Box, CircularProgress} from "@mui/material";
import React, {KeyboardEventHandler, type MutableRefObject, useEffect, useRef, useState} from 'react';
import "./App.css";
import {Message} from "../server/src/domain/Message";
import {type ImageInfo} from "../server/src/image/ImageInfo";
import {SystemPanel} from "./SystemPanel.tsx";
import {ChatContainer, ChatResponse} from "./ChatHistory.tsx";
import {ChatInput} from "./ChatInput.tsx";
import type {Dimension} from "../server/src/image/Dimension"

const DEFAULT_PORTRAIT = 0;
// const BASE_URL_PORTRAIT = "/img/1080x1920";
const BASE_URL_PORTRAIT = "/img/608x800"; // TODO get from server
const SERVER_PORT = 3001;

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

type CompResponseProps = {
    response: ChatResponse,
    loading: boolean,
    videoRef: MutableRefObject<HTMLVideoElement | null>,
    hideVideo: () => void;
    showVideo: () => void;
}

/**
 * Composite response component. Includes chat history, and either audio or video.
 * @param response
 * @param videoRef
 * @param hideVideo
 * @param showVideo
 * @constructor
 */
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

    return <ChatContainer messages={response.messages}/>;
}

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
    const [dimension, setDimension] = useState<Dimension | null>(null);
    const inputRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        try {
            fetch(`//${location.hostname}:${SERVER_PORT}/portraits`).then(result => {
                result.json().then(data => {
                    setImages(data?.images || null);
                    setDimension(data?.dimension || null)
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
            <SystemPanel appTitle="Loquacious" images={images} setImageIndex={setImageIndex} imageIndex={imageIndex} serverPort={SERVER_PORT}
                         resetResponse={resetResponse} dimension={dimension}/>
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