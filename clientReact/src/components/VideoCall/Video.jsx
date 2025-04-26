import { useEffect, useRef } from "react";

function Video({ stream }) {
  const videoRef = useRef(null);

  useEffect(() => {
    videoRef.current.srcObject = stream;
  }, [stream]);

  return <video playsInline autoPlay ref={videoRef} style={{width: "300px", aspectRatio: "16/9"}} />;
}

export default Video;
