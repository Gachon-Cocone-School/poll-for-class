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
