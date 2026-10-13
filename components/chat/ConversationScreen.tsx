import { useChatMessagesQuery ,
  useBlockedChatUsersQuery,
  useBlockChatUserMutation,
  useChatContactsQuery,
  useChatThreadsQuery,
  useUnblockChatUserMutation,
} from "@/hooks/chat/chat";
import { uploadChatFile } from "@/api/chat/chat.api";
import { useAuthStore } from "@/store/auth.store";
import { router, useLocalSearchParams } from "expo-router";
import * as Location from "expo-location";
import React, { useMemo, useRef, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import {
  ActivityIndicator,
  Alert,
  Image,
  ImageSourcePropType,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Modal,
  ScrollView,
  Text,
  Pressable,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView , useSafeAreaInsets } from "react-native-safe-area-context";
import { toast } from "sonner-native";
import ChatAttachmentTray from "./ChatAttachmentTray";
import ChatComposer from "./ChatComposer";
import ChatMessageBubble from "./ChatMessageBubble";
import ConversationHeader from "./ConversationHeader";
import { MessageModel } from "./chatData";
import {
  sendChatTypingViaSocket,
  sendChatMessageWithFallback,
  sendChatReadViaSocket,
  useChatThreadPresence,
  useChatUserOnlineStatus,
  useChatSocket,
} from "@/lib/chat-socket";



const placeholderAvatar = require("../../assets/images/placeholder-person.png");
const MESSAGE_BATCH_SIZE = 20;
const TOP_LOAD_THRESHOLD = 80;
const BOTTOM_STICKY_THRESHOLD = 80;

function getCurrentTimeLabel() {
  const now = new Date();
  return now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatMessageTime(value?: string | null) {
  if (!value) {
    return getCurrentTimeLabel();
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return getCurrentTimeLabel();
  }

  return parsed.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function resolveAvatarSource(value?: string | ImageSourcePropType | null) {
  if (!value) {
    return placeholderAvatar;
  }

  if (typeof value !== "string") {
    return value;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return placeholderAvatar;
  }

  if (
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("file://") ||
    trimmed.startsWith("content://")
  ) {
    return { uri: trimmed };
  }

  return placeholderAvatar;
}

function getUploadFileName(uri: string, fallback: string) {
  const parts = uri.split("/");
  return parts[parts.length - 1] || fallback;
}

function resolveMessageKind(mediaType?: string | null, locationUrl?: string | null) {
  if (locationUrl) {
    return "location" as const;
  }

  if (mediaType === "image") {
    return "image" as const;
  }

  return "text" as const;
}

function formatCoordinate(value: number) {
  return value.toFixed(6);
}

type PendingAttachment =
  | {
      type: "image";
      uri: string;
      name: string;
      mimeType: string;
      previewText: string;
    }
  | {
      type: "location";
      latitude: number;
      longitude: number;
      locationLabel: string;
      locationUrl: string;
      previewText: string;
    };

export default function ConversationScreen() {
  const { threadId, name, avatarUrl, userId: routeUserId, isOnline } = useLocalSearchParams<{
    threadId?: string;
    name?: string;
    avatarUrl?: string;
    userId?: string;
    role?: string;
    isOnline?: string;
  }>();
  const resolvedThreadId = Array.isArray(threadId) ? threadId[0] : threadId;
  const resolvedRoleParam = useLocalSearchParams<{ role?: string }>().role;

  const userId = useAuthStore((state) => state.user?.id);
  const token = useAuthStore((state) => state.token);
  const [messageText, setMessageText] = useState("");
  const [attachmentsOpen, setAttachmentsOpen] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [optimisticMessages, setOptimisticMessages] = useState<MessageModel[]>([]);
  const [pendingAttachment, setPendingAttachment] = useState<PendingAttachment | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [isPickingLocation, setIsPickingLocation] = useState(false);
  const [visibleMessageCount, setVisibleMessageCount] = useState(MESSAGE_BATCH_SIZE);
  const insets = useSafeAreaInsets();
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const readSyncedThreadRef = useRef<string | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const initialScrollDoneRef = useRef(false);
  const topLoadArmedRef = useRef(false);
  const preserveScrollRef = useRef(false);
  const currentScrollOffsetRef = useRef(0);
  const currentContentHeightRef = useRef(0);
  const previousContentHeightRef = useRef(0);
  const isNearBottomRef = useRef(true);

  const messagesQuery = useChatMessagesQuery(resolvedThreadId);
  useChatSocket(resolvedThreadId);
  const { isOtherTyping } = useChatThreadPresence(resolvedThreadId);

  const resolvedName = name || "Chat";
  const profileUserId = typeof routeUserId === "string" ? routeUserId : undefined;
  const profileRole = Array.isArray(resolvedRoleParam) ? resolvedRoleParam[0] : resolvedRoleParam;
  const resolvedAvatar = resolveAvatarSource(avatarUrl);
  const isParticipantOnline = useChatUserOnlineStatus(
    profileUserId ?? resolvedThreadId,
    isOnline === "true",
  );
  const currentRole = useAuthStore((state) => state.user?.role);
  const [menuVisible, setMenuVisible] = useState(false);
  const chatContactsQuery = useChatContactsQuery("");
  const chatThreadsQuery = useChatThreadsQuery("chat", "");
  const blockedUsersQuery = useBlockedChatUsersQuery();
  const blockMutation = useBlockChatUserMutation();
  const unblockMutation = useUnblockChatUserMutation();
  const blockedUserIds = useMemo(
    () => new Set((blockedUsersQuery.data ?? []).map((user: { id: string }) => user.id)),
    [blockedUsersQuery.data],
  );
  const matchedThread = useMemo(() => {
    if (!profileUserId) {
      return null;
    }

    return (chatThreadsQuery.data ?? []).find((thread) => thread.profileUserId === profileUserId);
  }, [chatThreadsQuery.data, profileUserId]);
  const isBlocked =
    (!!profileUserId && blockedUserIds.has(profileUserId)) ||
    !!matchedThread?.blockedByMe ||
    !!matchedThread?.blockedByOther;
  const isVisibleContact = useMemo(() => {
    if (!profileUserId) {
      return true;
    }

    return (chatContactsQuery.data ?? []).some((contact) => contact.id === profileUserId);
  }, [chatContactsQuery.data, profileUserId]);
  const canReplyInExistingThread = !!resolvedThreadId;
  const blockNotice = matchedThread?.blockedByMe
    ? "You blocked this user. Composer hidden."
    : matchedThread?.blockedByOther
      ? "This user blocked you. Composer hidden."
      : isBlocked
        ? "Chat composer hidden because this user is blocked."
        : "";
  const hideComposer =
    isBlocked ||
    (!!profileUserId &&
      !canReplyInExistingThread &&
      !isVisibleContact &&
      !chatContactsQuery.isLoading);
  const canBlockTarget = useMemo(() => {
    if (!profileUserId || profileUserId === userId) {
      return false;
    }

    if (currentRole === "admin") {
      return profileRole === "manager" || profileRole === "worker" || !profileRole;
    }

    if (currentRole === "manager") {
      return profileRole === "worker" || !profileRole;
    }

    return false;
  }, [currentRole, profileRole, profileUserId]);

  React.useEffect(() => {
    if (hideComposer) {
      setAttachmentsOpen(false);
      setPendingAttachment(null);
    }
  }, [hideComposer]);

  const handleToggleBlock = async () => {
    if (!profileUserId) {
      setMenuVisible(false);
      return;
    }

    if (!canBlockTarget) {
      Alert.alert("Not allowed", "You cannot block this user.");
      setMenuVisible(false);
      return;
    }

    try {
      if (isBlocked) {
        await unblockMutation.mutateAsync(profileUserId);
      } else {
        await blockMutation.mutateAsync(profileUserId);
      }
      setMenuVisible(false);
    } catch (_error) {
      // mutation already shows toast
    }
  };

  const allMessages = useMemo<MessageModel[]>(() => {
    const serverMessages: MessageModel[] = (messagesQuery.data ?? []).map((message) => ({
      id: message.id,
      text: message.text,
      time: formatMessageTime(message.time),
      rawTime: message.rawTime ?? message.time,
      sender: message.sender === "me" ? "me" : "other",
      isRead: message.isRead,
      kind: message.kind,
      imageUri: message.imageUri,
      senderId: message.senderId,
      senderName: message.senderName,
      senderAvatarUrl: message.senderAvatarUrl,
    }));

    const merged = [...serverMessages, ...optimisticMessages];
    return merged
      .filter(
        (message, index, array) => array.findIndex((item) => item.id === message.id) === index,
      )
      .sort((left, right) => {
        const leftTime = left.rawTime ? new Date(left.rawTime).getTime() : 0;
        const rightTime = right.rawTime ? new Date(right.rawTime).getTime() : 0;
        return leftTime - rightTime;
      });
  }, [messagesQuery.data, optimisticMessages, userId]);

  const visibleMessages = useMemo(() => {
    if (allMessages.length <= visibleMessageCount) {
      return allMessages;
    }

    const startIndex = Math.max(0, allMessages.length - visibleMessageCount);
    return allMessages.slice(startIndex);
  }, [allMessages, visibleMessageCount]);

  const lastOwnMessageId = useMemo(() => {
    for (let index = allMessages.length - 1; index >= 0; index -= 1) {
      if (allMessages[index]?.sender === "me") {
        return allMessages[index].id;
      }
    }

    return null;
  }, [allMessages]);

  const appendLocalMessage = (message: MessageModel) => {
    if (!resolvedThreadId) {
      return;
    }

    setOptimisticMessages((current) => [...current, message]);
  };

  const sendPayload = async (payload: {
    content?: string;
    mediaUrl?: string;
    mediaType?: "image" | "location";
    locationUrl?: string;
  }) => {
    if (!resolvedThreadId) {
      return;
    }

    const sentMessage = await sendChatMessageWithFallback(
      {
        threadId: resolvedThreadId,
        ...payload,
      },
      token,
    );

    const kind = resolveMessageKind(payload.mediaType, payload.locationUrl);
    appendLocalMessage({
      id: sentMessage.id,
      text:
        sentMessage.content ??
        payload.content ??
        (payload.locationUrl ? "Shared a location" : "Shared an image"),
      time: formatMessageTime(sentMessage.sentAt),
      rawTime: sentMessage.sentAt,
      sender: "me",
      kind,
      senderId: userId,
      imageUri: payload.mediaType === "image" ? payload.mediaUrl : undefined,
      mediaType: payload.mediaType,
      mediaUrl: payload.mediaUrl ?? payload.locationUrl,
    });

    void messagesQuery.refetch();
  };

  const handleSend = async () => {
    if (isSending) {
      return;
    }

    const text = messageText.trim();
    if (!resolvedThreadId) return;

    try {
      setIsSending(true);

      if (pendingAttachment) {
        if (pendingAttachment.type === "location") {
          await sendPayload({
            content: pendingAttachment.previewText,
            mediaUrl: pendingAttachment.locationUrl,
            mediaType: "location",
            locationUrl: pendingAttachment.locationUrl,
          });
        } else {
          const upload = await uploadChatFile({
            uri: pendingAttachment.uri,
            name: pendingAttachment.name,
            type: pendingAttachment.mimeType,
          });

          await sendPayload({
            content: pendingAttachment.previewText,
            mediaUrl: upload.url,
            mediaType: pendingAttachment.type,
          });
        }

        setPendingAttachment(null);
        setMessageText("");
        return;
      }

      if (!text) return;



      await sendPayload({ content: text });
      setMessageText("");
      requestAnimationFrame(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      });
      if (resolvedThreadId) {
        void sendChatTypingViaSocket({ threadId: resolvedThreadId, isTyping: false }, token);
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to send message right now";
      toast.error(message);
    } finally {
      setIsSending(false);
    }
  };

  const handleTypingChange = (nextValue: string) => {
    if (!resolvedThreadId) {
      return;
    }

    const isTyping = nextValue.trim().length > 0;
    void sendChatTypingViaSocket({ threadId: resolvedThreadId, isTyping }, token);

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }

    if (isTyping) {
      typingTimeoutRef.current = setTimeout(() => {
        void sendChatTypingViaSocket({ threadId: resolvedThreadId, isTyping: false }, token);
      }, 1500);
    }
  };

  const handlePickFromGallery = async () => {
    if (!resolvedThreadId) return;

    const ImagePicker = await import("expo-image-picker");
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permission.status !== "granted") {
      Alert.alert("Permission needed", "Please allow photo library access.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.8,
    });

    if (result.canceled || !result.assets[0]) {
      return;
    }

    const asset = result.assets[0];
    setPendingAttachment({
      type: "image",
      uri: asset.uri,
      name: asset.fileName ?? getUploadFileName(asset.uri, "chat-image.jpg"),
      mimeType: asset.mimeType ?? "image/jpeg",
      previewText: "Shared an image",
    });
    setAttachmentsOpen(false);
  };

  const handleOpenCamera = async () => {
    if (!resolvedThreadId) return;

    const ImagePicker = await import("expo-image-picker");
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (permission.status !== "granted") {
      Alert.alert("Permission needed", "Please allow camera access.");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ["images"],
      quality: 0.8,
    });

    if (result.canceled || !result.assets[0]) {
      return;
    }

    const asset = result.assets[0];
    setPendingAttachment({
      type: "image",
      uri: asset.uri,
      name: asset.fileName ?? getUploadFileName(asset.uri, "camera-image.jpg"),
      mimeType: asset.mimeType ?? "image/jpeg",
      previewText: "Shared an image",
    });
    setAttachmentsOpen(false);
  };

  const handlePickLocation = async () => {
    if (!resolvedThreadId) return;

    try {
      setIsPickingLocation(true);

      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== "granted") {
        Alert.alert("Permission needed", "Please allow location access.");
        return;
      }

      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const { latitude, longitude } = currentLocation.coords;
      let locationLabel = `Lat ${formatCoordinate(latitude)}, Lng ${formatCoordinate(longitude)}`;

      const address = await Location.reverseGeocodeAsync({ latitude, longitude });
      const firstAddress = address[0];
      if (firstAddress) {
        const parts = [
          firstAddress.name,
          firstAddress.street,
          firstAddress.city,
          firstAddress.region,
          firstAddress.country,
        ].filter(Boolean);

        if (parts.length > 0) {
          locationLabel = parts.join(", ");
        }
      }

      const latitudeText = formatCoordinate(latitude);
      const longitudeText = formatCoordinate(longitude);
      const locationUrl = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;

      setPendingAttachment({
        type: "location",
        latitude,
        longitude,
        locationLabel,
        locationUrl,
        previewText: `Shared location: ${locationLabel}\nLatitude: ${latitudeText}\nLongitude: ${longitudeText}`,
      });
      setAttachmentsOpen(false);
    } catch (_error) {
      console.log("[Conversation] reverse geocode failed");
    } finally {
      setIsPickingLocation(false);
    }
  };

  const scrollToBottom = (animated = false) => {
    requestAnimationFrame(() => {
      scrollViewRef.current?.scrollToEnd({ animated });
    });
  };

  const handleScroll = (event: any) => {
    const {
      contentOffset,
      contentSize,
      layoutMeasurement,
    } = event.nativeEvent;

    currentScrollOffsetRef.current = contentOffset?.y ?? 0;
    currentContentHeightRef.current = contentSize?.height ?? currentContentHeightRef.current;

    const distanceFromBottom =
      (contentSize?.height ?? 0) -
      ((contentOffset?.y ?? 0) + (layoutMeasurement?.height ?? 0));
    isNearBottomRef.current = distanceFromBottom <= BOTTOM_STICKY_THRESHOLD;

    if ((contentOffset?.y ?? 0) > TOP_LOAD_THRESHOLD) {
      topLoadArmedRef.current = false;
    }

    if (
      (contentOffset?.y ?? 0) <= TOP_LOAD_THRESHOLD &&
      messagesQuery.hasNextPage &&
      !topLoadArmedRef.current &&
      !messagesQuery.isFetchingNextPage
    ) {
      topLoadArmedRef.current = true;
      preserveScrollRef.current = true;
      previousContentHeightRef.current = currentContentHeightRef.current;
      void messagesQuery.fetchNextPage().then(() => {
        setVisibleMessageCount((current) => current + MESSAGE_BATCH_SIZE);
      });
    }
  };

  const handleContentSizeChange = (_contentWidth: number, contentHeight: number) => {
    currentContentHeightRef.current = contentHeight;

    if (preserveScrollRef.current) {
      const heightDelta = contentHeight - previousContentHeightRef.current;
      const nextOffset = Math.max(0, currentScrollOffsetRef.current + Math.max(heightDelta, 0));

      requestAnimationFrame(() => {
        scrollViewRef.current?.scrollTo({ y: nextOffset, animated: false });
      });

      preserveScrollRef.current = false;
      return;
    }

    if (!initialScrollDoneRef.current && visibleMessages.length > 0) {
      scrollToBottom(false);
      initialScrollDoneRef.current = true;
      return;
    }

    if (isNearBottomRef.current) {
      scrollToBottom(false);
    }
  };

  React.useEffect(() => {
    initialScrollDoneRef.current = false;
    topLoadArmedRef.current = false;
    preserveScrollRef.current = false;
    currentScrollOffsetRef.current = 0;
    currentContentHeightRef.current = 0;
    previousContentHeightRef.current = 0;
    isNearBottomRef.current = true;
    setVisibleMessageCount(MESSAGE_BATCH_SIZE);

    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const showSubscription = Keyboard.addListener(showEvent, (event) => {
      setKeyboardHeight(event.endCoordinates?.height ?? 0);
    });
    const hideSubscription = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  React.useEffect(() => {
    if (!resolvedThreadId) return;
    if (readSyncedThreadRef.current === resolvedThreadId) return;
    if ((messagesQuery.data?.length ?? 0) === 0) return;

    readSyncedThreadRef.current = resolvedThreadId;
  
    void sendChatReadViaSocket(resolvedThreadId, token);
  }, [resolvedThreadId, token, messagesQuery.data?.length]);


  React.useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  return (
    <SafeAreaView edges={['top','left',"right"]} className="flex-1 bg-[#E9EDF1]">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 88 : 0}
      >
        <ConversationHeader
          name={resolvedName}
          avatarUrl={resolvedAvatar}
          idText={resolvedThreadId ? `ID: ${resolvedThreadId}` : "ID: #225432"}
          isOnline={isParticipantOnline}
          onBack={() => router.back()}
          onPressProfile={() =>
            router.push({
              pathname: "/screens/chat/userprofile",
              params: {
                name: resolvedName,
                avatarUrl: typeof avatarUrl === "string" ? avatarUrl : "",
                id: profileUserId ?? resolvedThreadId ?? "",
              },
            })
          }
          onPressMenu={() => setMenuVisible(true)}
        />

        <View className="flex-1">
          <ScrollView
            ref={scrollViewRef}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            onScroll={handleScroll}
            scrollEventThrottle={16}
            style={{ flex: 1 }}
            onContentSizeChange={handleContentSizeChange}
            contentContainerStyle={{
              flexGrow: 1,
              paddingTop: 12,
              paddingBottom: attachmentsOpen ? 24 : 12,
            }}
          >
            {visibleMessages.map((message, index) => (
              <ChatMessageBubble
                key={`${message.id ?? "message"}-${index}`}
                message={message}
                avatarUrl={resolvedAvatar}
                showSeen={
                  !!lastOwnMessageId &&
                  message.id === lastOwnMessageId &&
                  message.isRead === true
                }
                showSent={
                  !!lastOwnMessageId &&
                  message.id === lastOwnMessageId &&
                  message.sender === "me" &&
                  message.isRead !== true
                }
              />
            ))}
          </ScrollView>

          <View
            style={{
              backgroundColor: "#E9EDF1",
              paddingBottom: Math.max(keyboardHeight, 0) + Math.max(insets.bottom-36, 0),
            }}
          >
            {!hideComposer && pendingAttachment ? (
              <View className="mx-4 mb-3 rounded-[16px] border border-[#D8E0E8] bg-[#F8FAFC] p-3">
                <View className="flex-row items-start justify-between">
                  <View className="flex-1">
                    <Text className="text-[13px] font-semibold text-[#1D5478]">Preview</Text>
                    {pendingAttachment.type === "image" ? (
                      <Image
                        source={{ uri: pendingAttachment.uri }}
                        className="mt-2 h-36 w-full rounded-[12px]"
                      />
                    ) : null}
                    {pendingAttachment.type === "location" ? (
                      <>
                        <Text className="mt-2 text-[14px] text-[#2B2B2B]">
                          {pendingAttachment.locationLabel}
                        </Text>
                        <Text className="mt-1 text-[12px] text-[#66707B]">
                          {`Latitude: ${formatCoordinate(pendingAttachment.latitude)}`}
                        </Text>
                        <Text className="mt-1 text-[12px] text-[#66707B]">
                          {`Longitude: ${formatCoordinate(pendingAttachment.longitude)}`}
                        </Text>
                      </>
                    ) : null}
                    {pendingAttachment.type !== "location" ? (
                      <Text className="mt-1 text-[12px] text-[#66707B]">
                        {pendingAttachment.previewText}
                      </Text>
                    ) : null}
                  </View>
                  <TouchableOpacity
                    onPress={() => setPendingAttachment(null)}
                    className="ml-3 h-8 w-8 items-center justify-center rounded-full bg-[#E9EDF1]"
                  >
                    <Text className="text-[16px] text-[#475569]">x</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : null}
            {!hideComposer && isOtherTyping ? (
              <View className="px-5 pb-2">
                <Text className="text-[12px] text-[#66707B]">
                  {`${resolvedName} is typing...`}
                </Text>
              </View>
            ) : null}
            {!hideComposer ? (
              <>
                <ChatComposer
                  value={messageText}
                  onChangeText={setMessageText}
                  onTypingChange={handleTypingChange}
                  onPressSend={handleSend}
                  attachmentsOpen={attachmentsOpen}
                  onToggleAttachments={() => setAttachmentsOpen((prev) => !prev)}
                  disabled={!messageText.trim() && !pendingAttachment}
                  isSending={isSending}
                />

                {attachmentsOpen ? (
                <ChatAttachmentTray
                  onPressPhoto={handlePickFromGallery}
                  onPressCamera={handleOpenCamera}
                  onPressLocation={handlePickLocation}
                  disabled={isPickingLocation || isSending}
                />
              ) : null}
              {isPickingLocation ? (
                <View className="absolute inset-x-0 bottom-0 items-center pb-28">
                  <View className="rounded-full bg-black/70 px-4 py-2">
                    <Text className="text-[13px] font-medium text-white">
                      Getting your location...
                    </Text>
                  </View>
                </View>
              ) : null}
            </>
            ) : (
              <View className="px-5 pb-4 pt-2 mb-8">
                <View className="rounded-[14px] border border-[#FECACA] bg-[#FFF1F2] px-4 py-3">
                  <Text className="text-[14px] font-medium text-[#B42318]">
                    {blockNotice || "You cannot start a new chat with this user."}
                  </Text>
                </View>
              </View>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>

      <Modal transparent visible={menuVisible} animationType="fade" onRequestClose={() => setMenuVisible(false)}>
        <Pressable
          className="flex-1 justify-end bg-black/30"
          onPress={() => setMenuVisible(false)}
        >
          <Pressable
            onPress={(event) => event.stopPropagation()}
            className="rounded-t-[24px] bg-white px-4 pb-6 pt-3"
          >
            <View className="mx-auto mb-3 h-1.5 w-14 rounded-full bg-[#D0D5DD]" />
            <Text className="mb-4 text-[16px] font-semibold text-[#101828]">
              Chat Options
            </Text>

            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => {
                setMenuVisible(false);
                router.push({
                  pathname: "/screens/chat/userprofile",
                  params: {
                    name: resolvedName,
                    avatarUrl: typeof avatarUrl === "string" ? avatarUrl : "",
                    id: profileUserId ?? resolvedThreadId ?? "",
                  },
                });
              }}
              className="mb-3 h-12 flex-row items-center justify-between rounded-[14px] bg-[#F8FAFC] px-4"
            >
              <Text className="text-[15px] font-medium text-[#101828]">
                View Profile
              </Text>
              <Ionicons name="person-outline" size={18} color="#475467" />
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.85}
              disabled={!canBlockTarget || blockMutation.isPending || unblockMutation.isPending}
              onPress={handleToggleBlock}
              className={`h-12 flex-row items-center justify-between rounded-[14px] px-4 ${
                !canBlockTarget ? "bg-[#F3F4F6]" : isBlocked ? "bg-[#FEE4E2]" : "bg-[#EEF4FF]"
              }`}
            >
              <Text
                className={`text-[15px] font-semibold ${
                  !canBlockTarget ? "text-[#98A2B3]" : isBlocked ? "text-[#B42318]" : "text-[#1D4ED8]"
                }`}
              >
                {blockMutation.isPending || unblockMutation.isPending
                  ? "Please wait..."
                  : !canBlockTarget
                    ? "Block unavailable"
                    : isBlocked
                      ? "Unblock"
                      : "Block"}
              </Text>
              {(blockMutation.isPending || unblockMutation.isPending) ? (
                <ActivityIndicator size="small" color="#1D4ED8" />
              ) : (
                <Ionicons
                  name={isBlocked ? "lock-open-outline" : "ban-outline"}
                  size={18}
                  color={!canBlockTarget ? "#98A2B3" : isBlocked ? "#B42318" : "#1D4ED8"}
                />
              )}
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => setMenuVisible(false)}
              className="mt-3 h-12 items-center justify-center rounded-[14px] bg-[#F8FAFC]"
            >
              <Text className="text-[15px] font-medium text-[#344054]">Cancel</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}
