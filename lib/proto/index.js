'use strict';

/**
 * Unified proto library — re-exports all atomic modules.
 *
 * Usage:
 *   const proto = require('./lib/proto');
 *   const { encodeActionReq, MessageId, Action } = proto;
 */

const enums = require('./enums');
const wrapper = require('./wrapper');
const auth = require('./auth');
const room = require('./room');
const gameFlow = require('./game-flow');
const seats = require('./seats');
const tournament = require('./tournament');
const timeBank = require('./time-bank');
const social = require('./social');
const rewards = require('./rewards');
const system = require('./system');

// Build a topic→decoder registry for dispatching incoming messages
const decoderRegistry = new Map();

function registerDecoder(topic, decoderFn) {
  decoderRegistry.set(topic, decoderFn);
}

// Auth
registerDecoder(enums.MessageId.UserTokenReq, auth.decodeUserTokenReq);
registerDecoder(enums.MessageId.UserTokenRes, auth.decodeUserTokenRes);

// Room
registerDecoder(enums.MessageId.EnterRoomReq, room.decodeEnterRoomReq);
registerDecoder(enums.MessageId.EnterRoomRes, room.decodeEnterRoomRes);
registerDecoder(enums.MessageId.RoomSnapshotReq, room.decodeRoomSnapshotReq);
registerDecoder(enums.MessageId.RoomSnapshotMsg, room.decodeRoomSnapshotMsg);
registerDecoder(enums.MessageId.RoomConfReq, room.decodeRoomConfReq);
registerDecoder(enums.MessageId.RoomConfRes, room.decodeRoomConfRes);
registerDecoder(enums.MessageId.SitDownReq, room.decodeSitDownReq);
registerDecoder(enums.MessageId.SitDownRes, room.decodeSitDownRes);
registerDecoder(enums.MessageId.LeaveRoomReq, room.decodeLeaveRoomReq);
registerDecoder(enums.MessageId.LeaveRoomRes, room.decodeLeaveRoomRes);

// Game Flow
registerDecoder(enums.MessageId.DealerPosMsg, gameFlow.decodeDealerPosMsg);
registerDecoder(enums.MessageId.HoleCardsMsg, gameFlow.decodeHoleCardsMsg);
registerDecoder(enums.MessageId.BoardCardsMsg, gameFlow.decodeBoardCardsMsg);
registerDecoder(enums.MessageId.NeedActionMsg, gameFlow.decodeNeedActionMsg);
registerDecoder(enums.MessageId.ActionReq, gameFlow.decodeActionReq);
registerDecoder(enums.MessageId.ActionRes, gameFlow.decodeActionRes);
registerDecoder(enums.MessageId.PlayerActionMsg, gameFlow.decodePlayerActionMsg);
registerDecoder(enums.MessageId.PlayerStateMsg, gameFlow.decodePlayerStateMsg);
registerDecoder(enums.MessageId.ShowdownMsg, gameFlow.decodeShowdownMsg);
registerDecoder(enums.MessageId.RoundResultMsg, gameFlow.decodeRoundResultMsg);
registerDecoder(enums.MessageId.PotsMsg, gameFlow.decodePotsMsg);
registerDecoder(enums.MessageId.HoleCardListMsg, gameFlow.decodeHoleCardListMsg);
registerDecoder(enums.MessageId.HideHoleCardReq, gameFlow.decodeHideHoleCardReq);
registerDecoder(enums.MessageId.HideHoleCardRes, gameFlow.decodeHideHoleCardRes);
registerDecoder(enums.MessageId.AutoPlayMsg, gameFlow.decodeAutoPlayMsg);
registerDecoder(enums.MessageId.CancelAutoPlayReq, gameFlow.decodeCancelAutoPlayReq);
registerDecoder(enums.MessageId.CancelAutoPlayRes, gameFlow.decodeCancelAutoPlayRes);
registerDecoder(enums.MessageId.PauseGameReq, gameFlow.decodePauseGameReq);
registerDecoder(enums.MessageId.PauseGameRes, gameFlow.decodePauseGameRes);
registerDecoder(enums.MessageId.ResumeGameReq, gameFlow.decodeResumeGameReq);
registerDecoder(enums.MessageId.ResumeGameRes, gameFlow.decodeResumeGameRes);
registerDecoder(enums.MessageId.StandbyReq, gameFlow.decodeStandbyReq);
registerDecoder(enums.MessageId.StandbyRes, gameFlow.decodeStandbyRes);
registerDecoder(enums.MessageId.RoomBillReq, gameFlow.decodeRoomBillReq);
registerDecoder(enums.MessageId.RoomBillRes, gameFlow.decodeRoomBillRes);
registerDecoder(enums.MessageId.PlaybackReq, gameFlow.decodePlaybackReq);
registerDecoder(enums.MessageId.PlaybackRes, gameFlow.decodePlaybackRes);
registerDecoder(enums.MessageId.ChangeBlindMsg, gameFlow.decodeChangeBlindMsg);
registerDecoder(enums.MessageId.ShowCardReq, gameFlow.decodeShowCardReq);
registerDecoder(enums.MessageId.ShowCardRes, gameFlow.decodeShowCardRes);

// Seats
registerDecoder(enums.MessageId.SeatOccupiedMsg, seats.decodeSeatOccupiedMsg);
registerDecoder(enums.MessageId.SeatEmptyMsg, seats.decodeSeatEmptyMsg);
registerDecoder(enums.MessageId.NeedMoreCoinMsg, seats.decodeNeedMoreCoinMsg);
registerDecoder(enums.MessageId.PlayerLeaveMsg, seats.decodePlayerLeaveMsg);
registerDecoder(enums.MessageId.OtherRoomMsg, seats.decodeOtherRoomMsg);

// Social
registerDecoder(enums.MessageId.Emoji, social.decodeEmoji);
registerDecoder(enums.MessageId.EmojiRes, social.decodeEmojiRes);
registerDecoder(enums.MessageId.AnimReq, social.decodeAnimReq);
registerDecoder(enums.MessageId.AnimRes, social.decodeAnimRes);
registerDecoder(enums.MessageId.AnimMsg, social.decodeAnimMsg);
registerDecoder(enums.MessageId.VoiceReq, social.decodeVoiceReq);
registerDecoder(enums.MessageId.VoiceRes, social.decodeVoiceRes);
registerDecoder(enums.MessageId.VoiceMsg, social.decodeVoiceMsg);
registerDecoder(enums.MessageId.PlayerNickNameChangeMsg, social.decodePlayerNickNameChangeMsg);
registerDecoder(enums.MessageId.CelebrityBroadcastReq, social.decodeCelebrityBroadcastReq);
registerDecoder(enums.MessageId.CelebrityBroadcastRes, social.decodeCelebrityBroadcastRes);
registerDecoder(enums.MessageId.CelebrityBroadcastNotifyFullMsg, social.decodeCelebrityBroadcastNotifyFullMsg);
registerDecoder(enums.MessageId.CelebrityBroadcastListMsg, social.decodeCelebrityBroadcastListMsg);

// Tournament
registerDecoder(enums.MessageId.MttEnterGameReq, tournament.decodeMttEnterGameReq);
registerDecoder(enums.MessageId.MttEnterGameRes, tournament.decodeMttEnterGameRes);
registerDecoder(enums.MessageId.ReJoinReq, tournament.decodeReJoinReq);
registerDecoder(enums.MessageId.ReJoinRes, tournament.decodeReJoinRes);
registerDecoder(enums.MessageId.MttRoomSnapshotReq, tournament.decodeMttRoomSnapshotReq);
registerDecoder(enums.MessageId.MttRoomSnapshotRes, tournament.decodeMttRoomSnapshotRes);
registerDecoder(enums.MessageId.MttNotifyMsg, tournament.decodeMttNotifyMsg);
registerDecoder(enums.MessageId.RiseBlindNotifyMsg, tournament.decodeRiseBlindNotifyMsg);
registerDecoder(enums.MessageId.MttUserRankMsg, tournament.decodeMttUserRankMsg);
registerDecoder(enums.MessageId.MttUserOutMsg, tournament.decodeMttUserOutMsg);
registerDecoder(enums.MessageId.MttRoomChangeMsg, tournament.decodeMttRoomChangeMsg);
registerDecoder(enums.MessageId.MttStateNotifyMsg, tournament.decodeMttStateNotifyMsg);
registerDecoder(enums.MessageId.MttLastRoomNotifyMsg, tournament.decodeMttLastRoomNotifyMsg);
registerDecoder(enums.MessageId.MttRebuyMsg, tournament.decodeMttRebuyMsg);
registerDecoder(enums.MessageId.MttMorebuyMsg, tournament.decodeMttMorebuyMsg);
registerDecoder(enums.MessageId.MttCancelBuyReq, tournament.decodeMttCancelBuyReq);
registerDecoder(enums.MessageId.MttCancelBuyRes, tournament.decodeMttCancelBuyRes);
registerDecoder(enums.MessageId.MttRoomRankNotifyMsg, tournament.decodeMttRoomRankNotifyMsg);
registerDecoder(enums.MessageId.MttRoomEndNotifyMsg, tournament.decodeMttRoomEndNotifyMsg);
registerDecoder(enums.MessageId.MttStopReJoinNotifyMsg, tournament.decodeMttStopReJoinNotifyMsg);
registerDecoder(enums.MessageId.MttRoomStatusChangeMsg, tournament.decodeMttRoomStatusChangeMsg);
registerDecoder(enums.MessageId.MttGeoCheckMsg, tournament.decodeMttGeoCheckMsg);
registerDecoder(enums.MessageId.MttRestTimeNotifyMsg, tournament.decodeMttRestTimeNotifyMsg);
registerDecoder(enums.MessageId.MttRealTimeRecordReq, tournament.decodeMttRealTimeRecordReq);
registerDecoder(enums.MessageId.MttRealTimeRecordRes, tournament.decodeMttRealTimeRecordRes);
registerDecoder(enums.MessageId.SngRoomSnapShotMsg, tournament.decodeSngRoomSnapShotMsg);

// Time Bank
registerDecoder(enums.MessageId.TimeBankMsg, timeBank.decodeTimeBankMsg);
registerDecoder(enums.MessageId.TimeBankDurationMsg, timeBank.decodeTimeBankDurationMsg);
registerDecoder(enums.MessageId.BuyTimeReq, timeBank.decodeBuyTimeReq);
registerDecoder(enums.MessageId.BuyTimeRes, timeBank.decodeBuyTimeRes);
registerDecoder(enums.MessageId.TimeBankFlagSetReq, timeBank.decodeTimeBankFlagSetReq);
registerDecoder(enums.MessageId.TimeBankFlagSetRes, timeBank.decodeTimeBankFlagSetRes);

// Rewards
registerDecoder(enums.MessageId.EnterRewardMsg, rewards.decodeEnterRewardMsg);
registerDecoder(enums.MessageId.RewardMsg, rewards.decodeRewardMsg);

/**
 * Decode any message by topic ID.
 * @param {number} topic - MessageId
 * @param {Buffer|Uint8Array} body - Serialized protobuf body
 * @returns {{ topic: number, name: string, fields: object } | null}
 */
function decodeByTopic(topic, body) {
  const decoder = decoderRegistry.get(topic);
  if (!decoder) return null;
  const name = enums.MessageIdName[topic] || `Unknown(${topic})`;
  const fields = decoder(body);
  return { topic, name, fields };
}

module.exports = {
  // Enums
  ...enums,

  // Wrapper
  ...wrapper,

  // Auth
  ...auth,

  // Room
  ...room,

  // Game Flow
  ...gameFlow,

  // Seats
  ...seats,

  // Social
  ...social,

  // Tournament
  ...tournament,

  // Time Bank
  ...timeBank,

  // Rewards
  ...rewards,

  // System
  ...system,

  // Registry
  decoderRegistry,
  decodeByTopic,
};
