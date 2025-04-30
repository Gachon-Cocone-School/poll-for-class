# firebase spec 설명

firebase 에 다음과 같은 collection 이 있어.

- collection 이름 : groups

  - fields
    - group_name ( string )
    - group_description( string )
    - sub-collections
      - members
        - fields
          - member_name( string )
          - member_no( string )

- collection 이름 : polls
  - fields
    - poll_name( string )
    - poll_description( string )
    - poll_group(groups reference)
    - sub collections
      - questions
        - fields
          - question( string )
          - choices( string list )

# 화면 spec

## polls 화면

- polls 컬렉션을 리스트로 보여준다.
- 리스트 위에 groups 화면으로 가는 버튼과 새로 추가 버튼이 있다.
- 리스트에 수정, 삭제 버튼이 있다.
- 새로 추가, 수정 버튼을 누르면 poll 에 관한 상세 페이지가 뜨고 필드값을 넣을 수 있다.

## grops 화면

- groups 컬렉션을 리스트로 보여준다.
- 리스트 위에 polls 화면으로 가는 버튼과 새로 추가 버튼이 있다.
- 리스트에 수정, 삭제 버튼이 있다.
- 새로 추가, 수정 버튼을 누르면 group 에 관한 상세 페이지가 뜨고 필드값을 넣을 수 있다.

# 기술 spec

- t3 표준 폴더 구조를 유지한다.
- CSR 로 구현한다.

# poll play 기능

- poll 리스트에 play 버튼을 추가해야 함.
- play 버튼을 클릭하면 poll play 화면으로 이동함.

# poll play 화면

- 화면을 좌우 분할해서 각각 아래의 정보를 표출한다.

## 왼쪽 화면

- 맨위는 아래처럼 questions 를 좌우 이동할 수 있는 버튼과 몇번째 question 인지 보여주는 텍스트가 있다.
  - < 1/3 >
- 그 아래 현재의 질문과 choice 를 보여준디ㅏ.
  - 질문
  - 초이스 1
  - 초이스 2

## 오른쪽 화면

- group 에 소속된 모든 member 의 이름을 네모 박스로 보여준다.
- 네모 박스는 모두 같은 크기여야 한다.
- 총 50개의 네모박스가 모두 보여질 만한 크기로 만든다.

# poll start/end

- poll start / end 버튼의 초기 상태는 start 는 enable 이고 end 는 disable 이다.
- poll start 버튼을 누르면 < 1/3 > 버튼과 poll start 버튼이 disable 되고 poll end 버튼이 enable 된다.
- poll end 버튼을 누르면 < 1/3 > 버튼이 enable 되고 poll start 버튼이 enable 된다.
- poll start 버튼이 눌려지면 firebase 의 해당 poll 에 active_question 이라는 필드값에 현재 quesition 이 id 를 업데이트 한다.
- 화면이 refresh 되어도 현재 question 으로 navigation 되어야 한다.

# poll answer 화면

- 접근 경로
  - url/polls/answer/poll-id 경로로 접근 가능함.
- 로그인 기능
  - poll 에 해당하는 group 의 members 에 소속된 사람만 투표할 수 있다.
  - 로그인은 member name 과 member no 로 진행할 수 있다.
  - 한번 로그인 하면 저장되고 매번 로그인하지 않아도 된다.
- 로그인이 되고 나면 그 다음부터는 화면 오른쪽 위에 로그아운 버튼을 보여주고 누르면 로그아웃되게 한다.
- poll document 의 active_question 필드값이 없거나 null 인 경우
  - no poll available 을 보여준다.
- poll document 의 active_question 필드값이 있을 경우
  - question 에 해당하는 질문과 choice 를 선택하는 화면을 보여준다.
  - 제출 버튼을 누르면 결과를 questions collection 의 sub collection 으로 answers 라는 sub collection 으로 저장해준다. 그리고 제출 버튼을 "다시 제출" 로 표시해주고 이전 선택된 choice 가 선택되어 있다.

# poll result 기능

- poll end 버튼을 누르면 투표 결과가 집계가 된다.
- firebase 의 polls -> questions -> answers 의 내용을 모두 읽어서 choice 별로 count 값을 저장한다.
  - 저장될 위치는 polls -> questions 에 poll_result 라는 필드에 저장한다.
  - 필드의 내용은 choice 별 카운트 이다.
- poll start 버튼을 누르면 poll_result 값을 null 로 바꾼다.
- poll play 화면은 poll_result 값이 있을 경우 질문/choice 아래에 투표 결과를 수평바로 보여준다.
  - 득표 카운트와 퍼센티지를 모두 보여준다.

# firestore database 의 실시간 연동 기능 강화

onSnapshot, useState 를 이용해서 firestore database 와 실시간 연동하게 리팩토링 해줘.

# qr 보여주기

- QR 주소 : MY_END_POINT 환경변수 + '/polls/answer/{poll id}'
- QR 표시 위치 : poll play 화면의 왼쪽의 질문과 초이스 아래에 QR 을 그려준다.
- QR 은 Poll start 일 경우에만 보여준다.

# admin 암호 추가

- answer 화면을 제외한 나머지 화면은 admin 만 접근 가능해야 한다.
- admin 인증은 환경변수에 있는 비번으로 체크한다.

# batch member update

- Create Group 화면에 member 정보를 batch 로 업데이트 하는 기능을 만들고자 함
- description box 아래 한꺼번에 입력할 수 있는 텍스트 박스를 만든다.
- 이 텍스트 박스에 여러명의 member_name 과 member_no 를 자유 형식으로 따붙히면 이 텍스트를 chatgpt 의 gpt-4o-mini 모델로 정리해서 그 아래 members list 에 자동으로 채워준다.
- Create Group 버튼을 누르면 예전처럼 저장이 된다.
- 현재의 firebase 저장 루틴은 건드리지 말아야 한다.

202531003 강다빈
202532496 강현수
202531684 고지예
202534732 김도윤
202531030 김민석
202233958 김예준
202532232 김재은
202532307 김정관
202533710 김준교
202531061 김지훈
202533719 김하진
202533720 김혁
202435520 김현도
202532535 김호
202532538 남궁건
202531075 문정재
202532545 문준
202533730 문형원
202332651 박가희
202532239 박서우
202534020 박지용
202531381 백창준
202531105 서현유
202533756 석지함
202532333 설진혁
202534351 신의진
202532468 안지호
202532586 원유찬
202531266 유진석
202531136 윤서연
202531763 윤예원
202539119 응웬만또안
202531397 이도윤
202531270 이상민
202431787 이서영
202532356 이예은
202531414 임채원
202533853 장현준
202535539 전채은
202533863 정보민
202131737 정수환
202531773 정희수
202532276 조일규
202533018 천세민
202531221 최윤성
202533896 허정빈
202532489 홍다연
202531238 황수연

# answers 가 있는 poll 은 삭제되지 않는 현상 잡아야함.

# 투표 참가자 통계 집계

- poll end 버튼을 누르면 아래처럼 참가자의 통계를 집계해줘.
  - 통계 단위는 poll 단위임. 따라서 firestore database 에 polls 컬렉션에 저장해야함.
  - 통계는 아래와 같은 구조임.
    - member_name
    - 투표참가횟수
    - 다득표 선택을 맞춘 횟수
    - 점수 : 투표참가횟수 + 다득표 맞춘 횟수
    - 랭킹 : 몇등/참가자수

# answer 화면 개선

- 화면에 현재 로그인되어 있는 member_name 을 보여준다.
- firestore에 저장된 poll 에 participants_stat 필드가 존재할 경우 해당되는 나의 정보를 찾아서 보여준다.
  - 현재 나의 점수 : score 값 \* 10 을 해서 보여준다.
  - 현재 나의 랭킹 : rank / total # of participant_stats

# 리더보드 화면 개선

- 리더보드는 rank, name, score 만 보여준다.
- privacy 를 위해 1~5위까지만 보여주고 나머지는 scroll 해야 보이게 해준다.

# 스트링 테이블 분리

- 화면에 표시되는 메시지가 화면에 섞여 있어.
- 별도의 스트링테이블로 빼서 관리하기 좋게 만들어줘.
- 다국어버전은 안 만들거니 다국어 패키지는 사용하지 않을거야.
