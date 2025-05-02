/**
 * Application String Table
 *
 * 애플리케이션의 모든 UI 문자열을 한곳에서 관리합니다.
 * 화면에 표시되는 메시지를 중앙집중식으로 관리하여 일관성을 유지합니다.
 */

export const strings = {
  common: {
    loading: "로딩 중...",
    error: "오류가 발생했습니다",
    submit: "제출",
    submitAgain: "다시 제출",
    submitting: "제출 중...",
    save: "저장",
    cancel: "취소",
    delete: "삭제",
    edit: "수정",
    create: "생성",
    back: "뒤로",
    close: "닫기",
    yes: "예",
    no: "아니오",
    refresh: "새로고침",
    refreshing: "새로고침 중...",
    login: "로그인",
    logout: "로그아웃",
    loggingIn: "로그인 중...",
    process: "처리",
    actions: "작업",
    remove: "제거",
    unnamed: "이름 없음",
    deleting: "삭제 중",
  },

  poll: {
    title: "투표",
    polls: "투표 목록",
    create: "새 투표 생성",
    edit: "투표 수정",
    delete: "투표 삭제",
    play: "투표 실행",
    playing: "투표 진행",
    addPoll: "투표 추가",
    noPollsFound:
      '투표가 없습니다. "투표 추가" 버튼을 클릭하여 새 투표를 만드세요.',
    pollName: "투표 제목",
    pollDescription: "투표 설명",
    deleteConfirm: "이 투표를 삭제하시겠습니까?",
    creating: "투표 생성 중...",
    updating: "투표 업데이트 중...",
    update: "투표 업데이트",
    deleteError: "투표 삭제 중 오류가 발생했습니다: {0}",
    startPoll: "투표 시작",
    endPoll: "투표 종료",
    start: "투표 시작",
    end: "투표 종료",
    noQuestionsFound: "이 투표에 대한 질문이 없습니다.",
    noPollAvailable: "사용 가능한 투표가 없습니다.",
    pollNotFound: "요청한 투표를 찾을 수 없습니다.",
    questionNotFound: "활성 질문을 찾을 수 없습니다.",
    scanToAnswer: "투표에 참여하려면 QR 코드를 스캔하세요",
    scanQrToAnswer: "투표에 참여하려면 QR 코드를 스캔하세요",
    votes: "표",
    noQuestions: "이 투표에는 질문이 없습니다.",
    notFound: "투표를 찾을 수 없습니다.",
    notFoundDescription: "요청한 투표를 찾을 수 없습니다.",
    answer: "투표 응답",
    warning: "주의",
    previousQuestionWarning:
      "이 질문은 더 이상 활성화되지 않았습니다. 응답이 제출되지 않을 수 있습니다.",
    submitAnswerError: "응답을 제출하는 중 오류가 발생했습니다.",
    questionNoLongerActive: "이 질문은 더 이상 활성화되지 않았습니다.",
    noActiveQuestion: "활성화된 질문이 없습니다",
    noActiveQuestionDescription: "현재 진행 중인 투표가 없습니다.",
    questionNotFoundDescription: "요청한 질문을 찾을 수 없습니다.",
    loadError: "투표를 불러오는 중 오류가 발생했습니다: {0}",
    refreshPoll: "투표 새로고침",
    deleteAnswer: "응답 삭제",
    deleteAnswerConfirm: "이 멤버의 응답을 삭제하시겠습니까?",
    deleteAnswerError: "응답 삭제 중 오류가 발생했습니다.",
    deleteAllAnswers: "모든 응답 삭제",
    deleteAllAnswersConfirm:
      "이 질문에 대한 모든 응답을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.",
    deleteAllAnswersError: "응답 삭제 중 오류가 발생했습니다.",
  },

  group: {
    title: "그룹",
    groups: "그룹 목록",
    create: "그룹 생성",
    edit: "그룹 수정",
    delete: "그룹 삭제",
    addGroup: "그룹 추가",
    noGroupsFound:
      '그룹이 없습니다. "그룹 추가" 버튼을 클릭하여 새 그룹을 만드세요.',
    groupName: "그룹 이름",
    groupDescription: "그룹 설명",
    deleteConfirm: "이 그룹을 삭제하시겠습니까?",
    creating: "그룹 생성 중...",
    updating: "그룹 업데이트 중...",
    deleteError: "그룹 삭제 중 오류가 발생했습니다: {0}",
    members: "멤버",
    member: "멤버",
    memberName: "멤버 이름",
    memberNo: "멤버 번호",
    batchUpdate: "일괄 업데이트",
    batchUpdateDescription:
      "멤버 정보를 여기에 붙여넣으세요. AI가 자동으로 정리합니다.",
    processing: "처리 중...",
    totalMembers: "총 멤버 수: {0}",
    noMembersFound: "이 그룹에 멤버가 없습니다.",
    addMember: "멤버 추가",
    noMembers: "이 그룹에 멤버가 없습니다.",
    select: "그룹 선택",
  },

  question: {
    questions: "질문",
    addQuestion: "질문 추가",
    removeQuestion: "질문 제거",
    questionText: "질문 텍스트",
    choices: "선택지",
    addChoice: "선택지 추가",
    removeChoice: "선택지 제거",
    noQuestionActive: "활성화된 질문이 없습니다.",
    warningNoLongerActive: "경고: 이 질문은 더 이상 활성화되지 않습니다.",
    submissionFailed: "제출에 실패했습니다. 다시 시도해 주세요.",
    question: "질문",
    choice: "선택지",
  },

  stats: {
    title: "통계",
    participantStatistics: "참가자 통계: {0}",
    leaderboard: "리더보드",
    noStatsAvailable: "이 투표에 대한 리더보드 정보가 없습니다.",
    rank: "순위",
    name: "이름",
    score: "점수",
    participation: "참여",
    points: "점",
    rankDisplay: "{0} / {1}",

    // MemberStats component
    participant: "참가자",
    loadingStats: "리더보드 정보를 불러오는 중...",
    scoreDisplay: "{0}점",
    rankingDisplay: "{0} / {1}",
    memberStatsNoData: "통계 정보가 없습니다",
  },

  auth: {
    adminLogin: "관리자 로그인",
    adminPassword: "관리자 비밀번호",
    incorrectPassword: "비밀번호가 잘못되었습니다",
    memberLogin: "로그인",
    memberLoginDesc: "투표에 참여하려면 로그인하세요",
    name: "이름",
    memberNumber: "학번",
    notAMember: "이름 또는 학번이 잘못된 것 같습니다.",
    loginFailed: "로그인에 실패했습니다. 다시 시도해 주세요.",
    loginError: "로그인 중 오류가 발생했습니다.",
    authError: "인증 오류",
    pleaseLogout: "로그아웃 후 다시 로그인해 주세요.",
    loginAgain: "문제가 발생했습니다. 다시 로그인해 주세요.",
  },

  errors: {
    generalError: "오류가 발생했습니다: {0}",
    loadingError: "데이터 로딩 중 오류가 발생했습니다: {0}",
    submissionError: "제출 중 오류가 발생했습니다: {0}",
    notFound: "찾을 수 없음",
    missingRequiredData: "필수 데이터가 누락되었습니다",
  },
};

/**
 * 문자열에 변수를 삽입하는 유틸리티 함수
 * @param text 변수 플레이스홀더({0}, {1} 등)를 포함하는 문자열
 * @param args 플레이스홀더를 대체할 값들
 * @returns 변수가 대체된 최종 문자열
 */
export function formatString(text: string, ...args: any[]): string {
  return text.replace(/{(\d+)}/g, (match, index) => {
    return typeof args[index] !== "undefined" ? String(args[index]) : match;
  });
}

export default strings;
