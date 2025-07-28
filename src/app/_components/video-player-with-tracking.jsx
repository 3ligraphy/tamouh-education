"use client";

import { useState, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { Card, CardBody, Progress, Chip } from "@heroui/react";
import { CheckCircle, Play } from "lucide-react";
import { api } from "@/trpc/react";

export default function VideoPlayerWithTracking({ 
  videoData, 
  lessonId, 
  lessonTitle, 
  onVideoComplete 
}) {
  const t = useTranslations("VideoPlayer");
  const [watchTime, setWatchTime] = useState(0);
  const [totalTime, setTotalTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [completionRate, setCompletionRate] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [playerReady, setPlayerReady] = useState(false);
  const iframeRef = useRef(null);
  const playerRef = useRef(null);
  const updateIntervalRef = useRef(null);
  const watchTimeRef = useRef(0);
  const lastUpdateRef = useRef(0);

  // Get initial video completion status
  const { data: videoCompletion, refetch: refetchCompletion } = api.quiz.getVideoCompletion.useQuery({
    lessonId,
  });

  // Update video completion mutation
  const updateVideoCompletion = api.quiz.updateVideoCompletion.useMutation({
    onSuccess: (data) => {
      console.log("Video completion updated:", data);
      if (data.completed && !isCompleted) {
        setIsCompleted(true);
        onVideoComplete?.(data);
        refetchCompletion();
      }
    },
    onError: (error) => {
      console.error("Failed to update video completion:", error);
    }
  });

  // Initialize completion state from API
  useEffect(() => {
    if (videoCompletion) {
      setWatchTime(videoCompletion.watchTime);
      setTotalTime(videoCompletion.totalTime || 0);
      setCurrentTime(videoCompletion.lastPosition);
      setCompletionRate(videoCompletion.completionRate);
      setIsCompleted(videoCompletion.completed);
      watchTimeRef.current = videoCompletion.watchTime;
      
      console.log("Initialized video completion state:", videoCompletion);
    }
  }, [videoCompletion]);

  // Load Player.js library and initialize player
  useEffect(() => {
    const loadPlayerJs = () => {
      return new Promise((resolve, reject) => {
        // Check if Player.js is already loaded
        if (window.playerjs) {
          resolve(window.playerjs);
          return;
        }

        // Load Player.js library
        const script = document.createElement('script');
        script.src = '//assets.mediadelivery.net/playerjs/player-0.1.0.min.js';
        script.type = 'text/javascript';
        script.onload = () => {
          console.log('Player.js library loaded successfully');
          resolve(window.playerjs);
        };
        script.onerror = () => {
          console.error('Failed to load Player.js library');
          reject(new Error('Failed to load Player.js'));
        };
        document.head.appendChild(script);
      });
    };

    const initializePlayer = async () => {
      try {
        if (!iframeRef.current) return;

        const playerjs = await loadPlayerJs();
        
        // Wait a bit for iframe to be fully loaded
        setTimeout(() => {
          try {
            playerRef.current = new playerjs.Player(iframeRef.current);
            console.log('Player.js instance created');
            
            // Set up event listeners using official Player.js API
            setupPlayerEventListeners();
          } catch (error) {
            console.error('Error creating Player.js instance:', error);
            // Fallback to original postMessage system
            setupFallbackEventListeners();
          }
        }, 1000);
      } catch (error) {
        console.error('Error loading Player.js:', error);
        // Fallback to original postMessage system
        setupFallbackEventListeners();
      }
    };

    initializePlayer();

    return () => {
      if (playerRef.current) {
        // Clean up player instance
        try {
          playerRef.current.off('ready');
          playerRef.current.off('play');
          playerRef.current.off('pause');
          playerRef.current.off('ended');
          playerRef.current.off('timeupdate');
        } catch (error) {
          console.log('Error cleaning up player events:', error);
        }
      }
    };
  }, [videoData?.url]);

  // Setup Player.js event listeners
  const setupPlayerEventListeners = () => {
    if (!playerRef.current) return;

    console.log('Setting up Player.js event listeners');

    // Player ready event
    playerRef.current.on('ready', () => {
      console.log('Player is ready');
      setPlayerReady(true);
      setHasInteracted(true);
      
      // Get initial duration
      playerRef.current.getDuration((duration) => {
        if (duration > 0) {
          setTotalTime(duration);
          console.log('Video duration from Player.js:', duration);
        }
      });
    });

    // Play event
    playerRef.current.on('play', () => {
      console.log('Video started playing (Player.js)');
      setIsPlaying(true);
      setHasInteracted(true);
      lastUpdateRef.current = Date.now();
    });

    // Pause event
    playerRef.current.on('pause', () => {
      console.log('Video paused (Player.js)');
      setIsPlaying(false);
    });

    // Ended event
    playerRef.current.on('ended', () => {
      console.log('Video ended (Player.js)');
      setIsPlaying(false);
      setHasInteracted(true);
      
      // Mark as completed when video ends
      if (totalTime > 0) {
        updateVideoCompletion.mutate({
          lessonId,
          watchTime: Math.round(totalTime),
          totalTime: Math.round(totalTime),
          lastPosition: Math.round(totalTime),
          completed: true,
        });
      }
    });

    // Time update event - most important for progress tracking
    playerRef.current.on('timeupdate', (timingData) => {
      try {
        // Parse the JSON string to an object as per Bunny CDN documentation
        const data = JSON.parse(timingData);
        const currentSeconds = data.seconds;
        const duration = data.duration;
        
        if (currentSeconds !== undefined) {
          setCurrentTime(currentSeconds);
        }
        
        if (duration && duration > 0 && duration !== totalTime) {
          setTotalTime(duration);
        }
        
        console.log(`Video timeupdate (Player.js): ${currentSeconds}s / ${duration}s`);
      } catch (error) {
        console.error('Error parsing timeupdate data:', error, timingData);
      }
    });
  };

  // Fallback to original postMessage system
  const setupFallbackEventListeners = () => {
    console.log('Setting up fallback postMessage event listeners');
    
    const handleMessage = (event) => {
      if (!event.data || typeof event.data !== 'object') return;
      
      const data = event.data;
      console.log("Received video event (fallback):", data);
      
      switch (data.event) {
        case "video-metadata":
        case "loadedmetadata":
          if (data.duration) {
            setTotalTime(data.duration);
            console.log("Video duration set (fallback):", data.duration);
          }
          break;
        case "video-play":
        case "play":
          setIsPlaying(true);
          setHasInteracted(true);
          lastUpdateRef.current = Date.now();
          console.log("Video started playing (fallback)");
          break;
        case "video-pause":
        case "pause":
          setIsPlaying(false);
          console.log("Video paused (fallback)");
          break;
        case "video-ended":
        case "ended":
          setIsPlaying(false);
          setHasInteracted(true);
          console.log("Video ended (fallback)");
          if (totalTime > 0) {
            updateVideoCompletion.mutate({
              lessonId,
              watchTime: Math.round(totalTime),
              totalTime: Math.round(totalTime),
              lastPosition: Math.round(totalTime),
              completed: true,
            });
          }
          break;
        case "video-timeupdate":
        case "timeupdate":
          if (data.currentTime !== undefined) {
            setCurrentTime(data.currentTime);
          }
          break;
      }
    };

    window.addEventListener("message", handleMessage);
    
    return () => {
      window.removeEventListener("message", handleMessage);
    };
  };

  // Enhanced video progress tracking with multiple methods
  useEffect(() => {
    if (!isPlaying || !totalTime || !hasInteracted) return;

    updateIntervalRef.current = setInterval(() => {
      const now = Date.now();
      const deltaTime = (now - lastUpdateRef.current) / 1000;
      lastUpdateRef.current = now;

      // Only count time if user is actively watching (reasonable delta)
      if (deltaTime > 0 && deltaTime < 3) {
        watchTimeRef.current = Math.min(watchTimeRef.current + deltaTime, totalTime);
        const newCompletionRate = (watchTimeRef.current / totalTime) * 100;
        
        setWatchTime(watchTimeRef.current);
        setCompletionRate(newCompletionRate);
        
        console.log(`Watch progress: ${Math.round(watchTimeRef.current)}s / ${Math.round(totalTime)}s (${Math.round(newCompletionRate)}%)`);

        // Update backend every 15 seconds or when completion threshold is reached
        const shouldUpdate = Math.floor(watchTimeRef.current) % 15 === 0 || 
                            (newCompletionRate >= 80 && !isCompleted);
        
        if (shouldUpdate) {
          updateVideoCompletion.mutate({
            lessonId,
            watchTime: Math.round(watchTimeRef.current),
            totalTime: Math.round(totalTime),
            lastPosition: Math.round(currentTime),
            completed: newCompletionRate >= 80,
          });
        }
      }
    }, 1000);

    lastUpdateRef.current = Date.now();

    return () => {
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current);
      }
    };
  }, [isPlaying, totalTime, lessonId, hasInteracted, isCompleted]);

  // Save progress when component unmounts or page unloads
  useEffect(() => {
    const saveProgress = () => {
      if (watchTimeRef.current > 0 && totalTime > 0) {
        const finalCompletionRate = (watchTimeRef.current / totalTime) * 100;
        updateVideoCompletion.mutate({
          lessonId,
          watchTime: Math.round(watchTimeRef.current),
          totalTime: Math.round(totalTime),
          lastPosition: Math.round(currentTime),
          completed: finalCompletionRate >= 80,
        });
      }
    };

    window.addEventListener('beforeunload', saveProgress);
    
    return () => {
      window.removeEventListener('beforeunload', saveProgress);
      saveProgress();
    };
  }, [watchTime, totalTime, currentTime, lessonId]);

  // Force completion check button for testing/fallback
  const handleForceCompleteVideo = () => {
    if (totalTime > 0) {
      updateVideoCompletion.mutate({
        lessonId,
        watchTime: Math.round(totalTime * 0.8), // 80% completion
        totalTime: Math.round(totalTime),
        lastPosition: Math.round(totalTime * 0.8),
        completed: true,
      });
    }
  };

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  if (!videoData?.url) {
    return (
      <Card className="aspect-video">
        <CardBody className="flex items-center justify-center h-full">
          <div className="text-center space-y-4">
            <Play className="w-16 h-16 text-gray-400 mx-auto" />
            <p className="text-gray-600">{t("video_not_available")}</p>
          </div>
        </CardBody>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Video Player */}
      <Card className="overflow-hidden">
        <CardBody className="p-0">
          <div className="aspect-video bg-black relative">
            <iframe
              ref={iframeRef}
              id={`bunny-player-${lessonId}`}
              allow="accelerometer;gyroscope;autoplay;encrypted-media;picture-in-picture;"
              allowFullScreen={true}
              loading="lazy"
              src={`${videoData.url}?autoplay=false&t=${Math.floor(currentTime)}`}
              className="w-full h-full"
              title={lessonTitle}
            />
            
            {/* Completion Overlay */}
            {isCompleted && (
              <div className="absolute top-4 right-4">
                <Chip
                  color="success"
                  variant="shadow"
                  startContent={<CheckCircle className="w-4 h-4" />}
                >
                  {t("completed")}
                </Chip>
              </div>
            )}

            {/* Debug overlay - only in development */}
            {process.env.NODE_ENV === 'development' && (
              <div className="absolute bottom-4 left-4 bg-black/80 text-white p-2 rounded text-xs">
                Playing: {isPlaying ? 'Yes' : 'No'} | 
                Ready: {playerReady ? 'Yes' : 'No'} |
                Player.js: {playerRef.current ? 'Yes' : 'No'} |
                Progress: {Math.round(completionRate)}%
              </div>
            )}
          </div>
        </CardBody>
      </Card>

      {/* Progress Information */}
      <Card>
        <CardBody className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-medium">{t("watch_progress")}</h3>
            <div className="text-sm text-gray-600">
              {formatTime(watchTime)} / {formatTime(totalTime)}
            </div>
          </div>
          
          <Progress
            value={completionRate}
            color={isCompleted ? "success" : "primary"}
            className="w-full"
          />
          
          <div className="flex justify-between items-center text-sm text-gray-600">
            <span>{Math.round(completionRate)}% {t("watched")}</span>
            <div className="flex items-center gap-2">
              {completionRate >= 80 ? (
                <span className="text-green-600 font-medium">
                  ✓ {t("eligible_for_quiz")}
                </span>
              ) : (
                <span>
                  {t("watch_more", { percentage: Math.max(0, 80 - Math.round(completionRate)) })}
                </span>
              )}
              
              {/* Development helper button */}
              {process.env.NODE_ENV === 'development' && !isCompleted && totalTime > 0 && (
                <button
                  onClick={handleForceCompleteVideo}
                  className="px-2 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600"
                >
                  Force Complete (Dev)
                </button>
              )}
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  );
} 