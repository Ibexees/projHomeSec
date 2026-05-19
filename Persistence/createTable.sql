create table loginlog(
loginid serial,
userid int not null,
success boolean,
eventtime timestamp default now(),
primary key (loginid),
foreign key (userid)
	references users(id)

)

CREATE TABLE sensorlog (
  id SERIAL PRIMARY KEY,
  topic TEXT,
  state TEXT,
  battery INT,
  ts TIMESTAMP
);


alter table loginlog
add reason varchar

insert into loginlog(userid,success,reason)
values (2,false,'WRONG USERNAME')


CREATE VIEW latestSensordata as ( 
with base as(
select  topic, max(ts) ts
from sensorlog 
group by topic)
select base.topic,base.ts,sensorlog.state,sensorlog.battery 
from base 
join sensorlog 
	on base.ts = sensorlog.ts 
	and base.topic = sensorlog.topic)

CREATE TABLE alarm_state (
    id int primary key,
    armed boolean not null,
    updated_at timestamptz default now()
);

CREATE INDEX idx_alarm_state_updated_at
ON alarm_state(updated_at DESC);

create view latest_alarm_state as(
SELECT id, armed, updated_at
FROM alarm_state
ORDER BY updated_at DESC, id DESC
LIMIT 1);

ALTER TABLE public.alarm_state
ALTER COLUMN id
ADD GENERATED ALWAYS AS IDENTITY;


