let leaderboard=[]; // same leaderboard array as leaderboard.js

export default function handler(req,res){
  if(req.method==='POST'){
    const {old,new:newName}=req.body;
    const entry = leaderboard.find(e=>e.username===old);
    if(entry) entry.username=newName;
    res.status(200).json({success:true});
  }
}
