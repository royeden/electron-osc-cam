// THX <3 <3 <3
// https://medium.com/@kirstenlindsmith/translating-posenet-into-react-js-58f438c8605d

import { useCallback, useEffect, useRef, useState } from "react";
import * as poseNet from "@tensorflow-models/posenet";
import "@tensorflow/tfjs-backend-webgl";

import { drawKeyPoints, drawSkeleton } from "../utils/posenet";
import useAnimationFrame from "../lib/hooks/useAnimationFrame";

import Button from "./Button";
import useToggle from "../lib/hooks/useToggle";
import { map } from "../utils/p5";
import OSC_EVENTS from "../../main/events/osc";

const VIDEO = {
  height: 480,
  width: 640,
};

// TODO move every useEffect to hooks, it's messy here
const skeletonLineWidth = 5;

export default function Camera() {
  const posenet = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [cameraOn, toggleCameraOn] = useToggle();
  const [camera, setCamera] = useState(0);
  const [oscPort, setOscPort] = useState(3333);
  const [oscPortValue, setOscPortValue] = useState(oscPort);
  const [maxMapParts, setMaxMapParts] = useState(1000);
  const [minMapParts, setMinMapParts] = useState(0);
  const [maxMapRGB, setMaxMapRGB] = useState(1000);
  const [minMapRGB, setMinMapRGB] = useState(0);
  const [maxMapScore, setMaxMapScore] = useState(1000);
  const [minMapScore, setMinMapScore] = useState(0);
  const [] = useState(0);
  const [oscLoaded, , overrideOscLoaded] = useToggle();
  const [minScore, setMinScore] = useState(0.3);
  const [cameras, setCameras] = useState([]);
  const [modelActive, toggleModelActive] = useToggle();
  const [modelLoaded, , setModelLoaded] = useToggle();
  const [modelSkeleton, toggleModelSkeleton] = useToggle();

  const sendOSCMessage = useCallback(
    (route, ...messages) => {
      if (process.browser && oscLoaded)
        window.ipcRenderer.send(OSC_EVENTS.send, route, ...messages);
    },
    [oscLoaded]
  );

  const createClient = useCallback(() => {
    overrideOscLoaded(false);
    const port = Number(oscPort);
    if (process.browser && port > 999 && port < 10000) {
      window.ipcRenderer.send(OSC_EVENTS.create, port);
      window.ipcRenderer.once(OSC_EVENTS.created, () =>
        overrideOscLoaded(true)
      );
      setOscPortValue(port);
    }
  }, [oscPort]);

  useEffect(() => {
    if (process.browser) {
      window.ipcRenderer.on(OSC_EVENTS.sent, console.log);
    }
    createClient();
  }, []);

  useEffect(() => {
    function getCameras() {
      if (!navigator.mediaDevices?.enumerateDevices)
        throw new Error("Cannot get media devices from JS");
      return navigator.mediaDevices
        ?.enumerateDevices()
        .then((devices) =>
          devices.filter((device) => device.kind.includes("video"))
        )
        .then((devices) => {
          console.log("Devices list", devices);
          setCameras(devices);
          return devices;
        });
    }
    try {
      getCameras();
    } catch (error) {
      throw error;
    }
  }, []);

  useEffect(() => {
    const video = videoRef?.current;
    const canvas = canvasRef?.current;
    if (video && cameraOn && cameras.length > 0) {
      try {
        async function setupCamera() {
          video.width = VIDEO.width;
          video.height = VIDEO.height;
          const stream = await navigator.mediaDevices.getUserMedia({
            video: {
              deviceId: cameras[camera].deviceId,
              width: VIDEO.width,
              height: VIDEO.height,
            },
          });

          video.srcObject = stream;

          return new Promise((resolve) => {
            video.onloadedmetadata = () => {
              video.play();
              resolve(video);
            };
          });
        }
        setupCamera();

        async function setupCanvas() {
          canvas.width = VIDEO.width;
          canvas.height = VIDEO.height;
        }
        setupCanvas();
      } catch (error) {}
    }
  }, [camera, cameraOn, cameras]);

  useEffect(() => {
    try {
      async function loadModel() {
        posenet.current = await poseNet.load();
        setModelLoaded(true);
      }
      loadModel();
    } catch (error) {
      throw error;
    }
  }, []);

  useAnimationFrame(() => {
    const video = videoRef?.current;
    const canvas = canvasRef?.current;
    const net = posenet?.current;
    if (cameraOn && canvas) {
      const canvasContext = canvas.getContext("2d");

      function drawCamera() {
        canvasContext.clearRect(0, 0, VIDEO.width, VIDEO.height);

        canvasContext.save();
        canvasContext.scale(-1, 1);
        canvasContext.translate(-VIDEO.width, 0);
        canvasContext.drawImage(video, 0, 0, VIDEO.width, VIDEO.height);
        canvasContext.restore();

        try {
          let r = 0;
          let g = 0;
          let b = 0;
          const { data: pixels } = canvasContext.getImageData(
            0,
            0,
            VIDEO.width,
            VIDEO.height
          );
          pixels.forEach((colorValue, index) => {
            if (index % 4 === 0) r += colorValue;
            if (index % 4 === 1) g += colorValue;
            if (index % 4 === 2) b += colorValue;
          });
          r /= pixels.length / 4;
          g /= pixels.length / 4;
          b /= pixels.length / 4;
          r = map(r, 0, 255, minMapRGB, maxMapRGB);
          g = map(g, 0, 255, minMapRGB, maxMapRGB);
          b = map(b, 0, 255, minMapRGB, maxMapRGB);

          sendOSCMessage("/rgb", r, g, b);
        } catch (e) {
          console.log(e);
        }
      }

      if (modelActive && modelLoaded) {
        async function detectPose() {
          const { score, keypoints } = await net.estimateSinglePose(video, {
            flipHorizontal: true,
          });
          sendOSCMessage("/score", map(score, 0, 1, minMapScore, maxMapScore));
          keypoints.forEach(
            ({ part, score: partScore, position: { x, y } }) => {
              // TODO map values
              sendOSCMessage(
                `/${part}/score`,
                map(partScore, 0, 1, minMapScore, maxMapScore)
              );
              sendOSCMessage(
                `/${part}/x`,
                map(x, 0, VIDEO.width, minMapParts, maxMapParts, true)
              );
              sendOSCMessage(
                `/${part}/y`,
                map(y, 0, VIDEO.height, minMapParts, maxMapParts, true)
              );
            }
          );
          canvasContext.clearRect(0, 0, VIDEO.width, VIDEO.height);
          drawCamera();

          if (modelSkeleton) {
            drawKeyPoints(keypoints, minScore, "#f00", canvasContext);

            drawSkeleton(
              keypoints,
              minScore,
              "#f00",
              skeletonLineWidth,
              canvasContext
            );
          }
        }
        detectPose();
      } else {
        drawCamera();
      }
    }
  }, [
    cameraOn,
    maxMapParts,
    maxMapRGB,
    maxMapScore,
    minMapParts,
    minMapRGB,
    minMapScore,
    minScore,
    modelActive,
    modelLoaded,
    modelSkeleton,
  ]);

  return (
    <>
      <video className="hidden" playsInline ref={videoRef} />
      <canvas className="max-w-full" ref={canvasRef} />
      <div className="flex flex-col space-between">
        <div>
          {cameraOn ? (
            <>
              <Button onClick={toggleModelActive}>
                Turn tracking {modelActive ? "off" : "on"}
              </Button>
              <Button onClick={toggleModelSkeleton}>
                Turn skeleton {modelSkeleton ? "off" : "on"}
              </Button>
            </>
          ) : (
            <Button onClick={toggleCameraOn}>Turn camera on!</Button>
          )}
        </div>
        <div>
          <label className="cursor-pointer" htmlFor="min-score">
            Min tracking score:
          </label>
          <div>
            <input
              id="min-score"
              min="0.1"
              max="0.5"
              onChange={(event) => setMinScore(event.target.value)}
              step="0.1"
              type="range"
              value={minScore}
            />
            <span>{Math.floor(minScore * 100)}%</span>
          </div>
        </div>
        <div>
          <label className="cursor-pointer" htmlFor="osc-port">
            OSC port:
          </label>
          <input
            className="p-2 transition-colors duration-300 ease-in-out border-2 rounded-md hover:text-light focus:text-light text-light-high bg-dark hover:border-white focus:border-white hover:bg-dark-100 border-dark-800"
            id="osc-port"
            min="1000"
            max="9999"
            onKeyDown={(event) => {
              if (event.key === "Enter") createClient();
            }}
            onChange={(event) => setOscPort(event.target.value)}
            step="1"
            type="number"
            value={oscPort}
          />
          <Button
            disabled={oscPort && oscPort > 999 && oscPort < 10000}
            onClick={createClient}
          >
            Set port
          </Button>
        </div>
        <div>
          <label className="cursor-pointer" htmlFor="min-rgb">
            RGB map min:
          </label>
          <input
            className="p-2 transition-colors duration-300 ease-in-out border-2 rounded-md hover:text-light focus:text-light text-light-high bg-dark hover:border-white focus:border-white hover:bg-dark-100 border-dark-800"
            id="min-rgb"
            onChange={(event) => setMinMapRGB(event.target.value)}
            step="1"
            type="number"
            value={minMapRGB}
          />
        </div>
        <div>
          <label className="cursor-pointer" htmlFor="max-rgb">
            RGB map max:
          </label>
          <input
            className="p-2 transition-colors duration-300 ease-in-out border-2 rounded-md hover:text-light focus:text-light text-light-high bg-dark hover:border-white focus:border-white hover:bg-dark-100 border-dark-800"
            id="max-rgb"
            onChange={(event) => setMaxMapRGB(event.target.value)}
            step="1"
            type="number"
            value={maxMapRGB}
          />
        </div>
        <div>
          <label className="cursor-pointer" htmlFor="min-score">
            Score map min:
          </label>
          <input
            className="p-2 transition-colors duration-300 ease-in-out border-2 rounded-md hover:text-light focus:text-light text-light-high bg-dark hover:border-white focus:border-white hover:bg-dark-100 border-dark-800"
            id="min-score"
            onChange={(event) => setMinMapScore(event.target.value)}
            step="1"
            type="number"
            value={minMapScore}
          />
        </div>
        <div>
          <label className="cursor-pointer" htmlFor="max-score">
            Score map max:
          </label>
          <input
            className="p-2 transition-colors duration-300 ease-in-out border-2 rounded-md hover:text-light focus:text-light text-light-high bg-dark hover:border-white focus:border-white hover:bg-dark-100 border-dark-800"
            id="max-score"
            onChange={(event) => setMaxMapScore(event.target.value)}
            step="1"
            type="number"
            value={maxMapScore}
          />
        </div>
        <div>
          <label className="cursor-pointer" htmlFor="min-parts">
            Parts map min:
          </label>
          <input
            className="p-2 transition-colors duration-300 ease-in-out border-2 rounded-md hover:text-light focus:text-light text-light-high bg-dark hover:border-white focus:border-white hover:bg-dark-100 border-dark-800"
            id="min-parts"
            onChange={(event) => setMinMapParts(event.target.value)}
            step="1"
            type="number"
            value={minMapParts}
          />
        </div>
        <div>
          <label className="cursor-pointer" htmlFor="max-parts">
            Parts map max:
          </label>
          <input
            className="p-2 transition-colors duration-300 ease-in-out border-2 rounded-md hover:text-light focus:text-light text-light-high bg-dark hover:border-white focus:border-white hover:bg-dark-100 border-dark-800"
            id="max-parts"
            onChange={(event) => setMaxMapParts(event.target.value)}
            step="1"
            type="number"
            value={maxMapParts}
          />
        </div>
        <span>
          Client listening:{" "}
          {oscLoaded ? `Yes! Sending data to port ${oscPortValue}` : "Nope :("}
        </span>
        <span>Tracking: {modelActive ? "Active!" : "Off"}</span>
        <span>Skeleton: {modelSkeleton ? "Active!" : "Off"}</span>
        <span>Model: {modelLoaded ? "Loaded!" : "Loading..."}</span>
      </div>
    </>
  );
}
