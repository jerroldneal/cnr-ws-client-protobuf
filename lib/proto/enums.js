'use strict';

/**
 * All protobuf enum constants for the ClubWPT Gold protocol.
 * Frozen objects — immutable at runtime.
 */

const Action = Object.freeze({
  NONE_ACTION: 0,
  CHECK: 1,
  CALL: 2,
  BET: 3,
  FOLD: 4,
  RAISE: 5,
  ALL_IN: 6,
  OPT_FIRST_CHECK: 11,
});

const PlayerState = Object.freeze({
  NONE_STATE: 0,
  WAITING: 20,
  FORCE_BLIND: 21,
  PAUSE: 22,
  FORCE_ANTE: 23,
  PREPARE: 100,
  ZOMBIE: 101,
  HU_WAIT: 102,
});

const Code = Object.freeze({
  OK: 0,
  INVALID_TOKEN: 50001,
  INVALID_ROOM: 50002,
  INVALID_PARAM: 50003,
  INVALID_STATE: 50004,
  INVALID_ACTION: 50005,
  INVALID_TAKEIN: 50006,
  OVER_TURN: 50007,
  TIMEOUT: 50051,
  PLAYING: 50052,
  LESS_COIN: 50053,
  NEAR_GPS: 50054,
  SAME_IP: 50055,
  NO_SEAT: 50071,
  NO_ROOM: 50072,
  NO_LOGIN: 50073,
  CAN_LEAVE: 50074,
  OTHER_ROOM: 50075,
  FinalVoice: 50085,
});

const RoomFlags = Object.freeze({
  NONE: 0,
  CHECK_GPS: 1,
  CHECK_IP: 2,
});

const PlayerFlags = Object.freeze({
  NONE: 0,
  AUTO_PLAY: 1,
  HOLE_CARDS: 2,
});

const MessageId = Object.freeze({
  // Auth
  UserTokenReq: 50001,
  UserTokenRes: 50002,

  // Room
  EnterRoomReq: 50003,
  EnterRoomRes: 50004,
  RoomSnapshotReq: 50005,
  RoomSnapshotMsg: 50006,
  SitDownReq: 50013,
  SitDownRes: 50014,
  NeedMoreCoinMsg: 50016,
  LeaveRoomReq: 50029,
  LeaveRoomRes: 50030,
  SeatOccupiedMsg: 50032,
  SeatEmptyMsg: 50034,
  RoomConfReq: 50042,
  RoomConfRes: 50043,

  // Game Flow
  PlayerActionMsg: 50036,
  HoleCardListMsg: 50037,
  PlayerLeaveMsg: 50038,
  OtherRoomMsg: 50039,
  HideHoleCardReq: 50040,
  HideHoleCardRes: 50041,
  DealerPosMsg: 50102,
  HoleCardsMsg: 50104,
  BoardCardsMsg: 50106,
  ActionReq: 50109,
  ActionRes: 50110,
  NeedActionMsg: 50112,
  ShowdownMsg: 50114,
  RoundResultMsg: 50116,
  PotsMsg: 50120,
  PlayerStateMsg: 50124,
  AutoPlayMsg: 50133,
  CancelAutoPlayReq: 50134,
  CancelAutoPlayRes: 50135,
  PlaybackReq: 50136,
  PlaybackRes: 50137,
  ChangeBlindMsg: 50501,
  ShowCardReq: 50510,
  ShowCardRes: 50511,

  // Social
  Emoji: 50063,
  AnimReq: 50064,
  AnimRes: 50065,
  AnimMsg: 50066,
  EmojiRes: 50067,
  VoiceReq: 50069,
  VoiceRes: 50070,
  VoiceMsg: 50071,
  PlayerNickNameChangeMsg: 50122,
  CelebrityBroadcastReq: 50513,
  CelebrityBroadcastRes: 50514,
  CelebrityBroadcastNotifyFullMsg: 50515,
  CelebrityBroadcastListMsg: 50516,

  // Game Control
  PauseGameReq: 50125,
  PauseGameRes: 50126,
  StandbyReq: 50127,
  StandbyRes: 50128,
  ResumeGameReq: 50129,
  ResumeGameRes: 50130,
  RoomBillReq: 50131,
  RoomBillRes: 50132,

  // MTT / Tournament
  MttEnterGameReq: 60001,
  MttEnterGameRes: 60002,
  TimeBankMsg: 60502,
  ReJoinReq: 60503,
  ReJoinRes: 60504,
  EnterRewardMsg: 60507,
  RewardMsg: 60508,
  RiseBlindNotifyMsg: 60509,
  MttNotifyMsg: 60510,
  BuyTimeReq: 60512,
  BuyTimeRes: 60513,
  SngRoomSnapShotMsg: 60514,
  MttRoomRankNotifyMsg: 60516,
  MttRestTimeNotifyMsg: 60518,
  MttRoomSnapshotReq: 60519,
  MttRoomSnapshotRes: 60520,
  MttRealTimeRecordReq: 60521,
  MttRealTimeRecordRes: 60522,
  MttRoomEndNotifyMsg: 60528,
  MttStopReJoinNotifyMsg: 60529,
  MttUserRankMsg: 60530,
  MttUserOutMsg: 60531,
  MttRoomChangeMsg: 60533,
  MttStateNotifyMsg: 60542,
  MttLastRoomNotifyMsg: 60543,
  TimeBankFlagSetReq: 60555,
  TimeBankFlagSetRes: 60556,
  TimeBankDurationMsg: 60557,
  MttRebuyMsg: 60564,
  MttMorebuyMsg: 60565,
  MttCancelBuyReq: 60566,
  MttCancelBuyRes: 60567,
  MttRoomStatusChangeMsg: 60572,
  MttGeoCheckMsg: 60574,
});

const MttRoomStatus = Object.freeze({
  NULL: 0,
  WAIT_MORE: 3,
  BET_PRE_ROUND: 4,
  PRE_FLOP: 5,
  FLOP: 6,
  TURN: 7,
  RIVER: 8,
  SETTLE: 30,
  NEXT_ROUND: 31,
  PREPARE: 32,
  SNG_PAUSE: 1002,
  REST: 1004,
  PAUSE: 1005,
  END: 1006,
  FINALE_PAUSE: 1007,
  SYNC_POKER: 1008,
  REBUY: 1010,
  MYSTERY: 1011,
});

const JoinType = Object.freeze({
  Null: 0,
  ReBuy: 1,
  ReJoin: 2,
  Join: 3,
  MoreBuy: 4,
});

const MttStatus = Object.freeze({
  prepare: 0,
  Playing: 1,
  will_rest: 3,
  rest: 4,
  pause: 5,
  end: 6,
  final_pause: 7,
});

const GoldType = Object.freeze({
  Gold: 0,
  Usdt: 1,
});

// Reverse lookups
function buildReverseLookup(enumObj) {
  const rev = {};
  for (const [k, v] of Object.entries(enumObj)) {
    rev[v] = k;
  }
  return Object.freeze(rev);
}

const ActionName = buildReverseLookup(Action);
const PlayerStateName = buildReverseLookup(PlayerState);
const CodeName = buildReverseLookup(Code);
const MessageIdName = buildReverseLookup(MessageId);
const MttRoomStatusName = buildReverseLookup(MttRoomStatus);
const JoinTypeName = buildReverseLookup(JoinType);
const MttStatusName = buildReverseLookup(MttStatus);

module.exports = {
  Action,
  PlayerState,
  Code,
  RoomFlags,
  PlayerFlags,
  MessageId,
  MttRoomStatus,
  JoinType,
  MttStatus,
  GoldType,
  // Reverse lookups
  ActionName,
  PlayerStateName,
  CodeName,
  MessageIdName,
  MttRoomStatusName,
  JoinTypeName,
  MttStatusName,
};
