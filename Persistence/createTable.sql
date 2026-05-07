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




