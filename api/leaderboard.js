let leaderboard=[];

export default function handler(req,res){
  if(req.method==='POST'){
    const {username,score}=req.body;
    const existing = leaderboard.find(p=>p.username===username);
    if(existing) existing.score=Math.max(existing.score,score);
    else leaderboard.push({username,score});
    leaderboard.sort((a,b)=>b.score-a.score);
    leaderboard=leaderboard.slice(0,50);
    res.status(200).json({success:true});
  }else{
    res.status(200).json(leaderboard);
  }
}
