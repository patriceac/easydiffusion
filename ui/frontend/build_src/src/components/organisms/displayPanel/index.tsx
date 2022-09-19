import React, { useEffect, useState, useRef } from "react";
import { useImageQueue } from "../../../stores/imageQueueStore";

import { ImageRequest, useImageCreate } from "../../../stores/imageCreateStore";

import { useQuery, useQueryClient } from "@tanstack/react-query";

import { doMakeImage, MakeImageKey } from "../../../api";

import AudioDing from "./audioDing";

// import GeneratedImage from "../../molecules/generatedImage";
// import DrawImage from "../../molecules/drawImage";

import CurrentDisplay from "./currentDisplay";
import CompletedImages from "./completedImages";

import {
  displayPanel,
  displayContainer,
  // CurrentDisplay,
  previousImages,
  previousImage, // @ts-expect-error
} from "./displayPanel.css.ts";

export interface CompletedImagesType {
  id: string;
  data: string;
  info: ImageRequest;
}

export default function DisplayPanel() {
  const dingRef = useRef<HTMLAudioElement>(null);
  const isSoundEnabled = useImageCreate((state) => state.isSoundEnabled());
  // @ts-expect-error
  const { id, options } = useImageQueue((state) => state.firstInQueue());
  const removeFirstInQueue = useImageQueue((state) => state.removeFirstInQueue);
  const [currentImage, setCurrentImage] = useState<CompletedImagesType | null>(
    null
  );



  const [isEnabled, setIsEnabled] = useState(false);

  const [isLoading, setIsLoading] = useState(false);


  const { status, data } = useQuery(
    [MakeImageKey, id],
    async () => await doMakeImage(options),
    {
      enabled: isEnabled
      // void 0 !== id,
    }
  );
  // update the enabled state when the id changes
  useEffect(() => {
    setIsEnabled(void 0 !== id)
  }, [id]);

  useEffect(() => {
    if (isEnabled && status === "loading") {
      setIsLoading(true);
    } else {
      setIsLoading(false);
    }
  }, [isEnabled, status]);


  useEffect(() => {
    console.log("status", status);
    // query is done
    if (status === "success") {
      // check to make sure that the image was created
      if (data.status === "succeeded") {
        if (isSoundEnabled) {
          dingRef.current?.play();
        }
        removeFirstInQueue();
      }
    }
  }, [status, data, removeFirstInQueue, dingRef, isSoundEnabled]);

  /* COMPLETED IMAGES */
  const queryClient = useQueryClient();
  const [completedImages, setCompletedImages] = useState<CompletedImagesType[]>(
    []
  );
  const completedIds = useImageQueue((state) => state.completedImageIds);

  // const init_image = useImageCreate((state) =>
  //   state.getValueForRequestKey("init_image")
  // );

  useEffect(() => {
    const testReq = {} as ImageRequest;
    const completedQueries = completedIds.map((id) => {
      const imageData = queryClient.getQueryData([MakeImageKey, id]);
      return imageData;
    }) as ImageRequest[];

    if (completedQueries.length > 0) {
      // map the completedImagesto a new array
      // and then set the state
      const temp = completedQueries
        .map((query, index) => {
          if (void 0 !== query) {
            // @ts-ignore
            return query.output.map((data) => {
              // @ts-ignore
              return {
                id: `${completedIds[index]}-${data.seed}`,
                data: data.data,
                // @ts-ignore
                info: { ...query.request, seed: data.seed },
              };
            });
          }
        })
        .flat()
        .reverse()
        .filter((item) => void 0 !== item) as CompletedImagesType[]; // remove undefined items

      setCompletedImages(temp);

      console.log("temp", temp);

      setCurrentImage(temp[0] || null);
    } else {
      setCompletedImages([]);
      setCurrentImage(null);
    }
  }, [setCompletedImages, setCurrentImage, queryClient, completedIds]);

  useEffect(() => {
    console.log("completedImages", currentImage);
  }, [currentImage]);

  return (
    <div className={displayPanel}>
      <AudioDing ref={dingRef}></AudioDing>
      <div className={displayContainer}>
        <CurrentDisplay isLoading={isLoading} image={currentImage}></CurrentDisplay>
      </div>
      <div className={previousImages}>
        <CompletedImages
          images={completedImages}
          setCurrentDisplay={setCurrentImage}
        ></CompletedImages>
      </div>
    </div>
  );
}
