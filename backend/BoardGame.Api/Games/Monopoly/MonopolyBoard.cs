namespace BoardGame.Api.Games.Monopoly;

public static class MonopolyBoard
{
    public static Tile[] Create() =>
    [
        new(0,"GO","Go"),
        new(1,"Mediterranean Avenue","Street","Brown",60,50,[2,10,30,90,160,250]),
        new(2,"Quỹ cộng đồng","Chest"),
        new(3,"Baltic Avenue","Street","Brown",60,50,[4,20,60,180,320,450]),
        new(4,"Thuế thu nhập","Tax",Price:200),
        new(5,"Reading Railroad","Railroad",Price:200),
        new(6,"Oriental Avenue","Street","LightBlue",100,50,[6,30,90,270,400,550]),
        new(7,"Cơ hội","Chance"),
        new(8,"Vermont Avenue","Street","LightBlue",100,50,[6,30,90,270,400,550]),
        new(9,"Connecticut Avenue","Street","LightBlue",120,50,[8,40,100,300,450,600]),
        new(10,"Nhà tù / Thăm tù","Jail"),
        new(11,"St. Charles Place","Street","Pink",140,100,[10,50,150,450,625,750]),
        new(12,"Electric Company","Utility",Price:150),
        new(13,"States Avenue","Street","Pink",140,100,[10,50,150,450,625,750]),
        new(14,"Virginia Avenue","Street","Pink",160,100,[12,60,180,500,700,900]),
        new(15,"Pennsylvania Railroad","Railroad",Price:200),
        new(16,"St. James Place","Street","Orange",180,100,[14,70,200,550,750,950]),
        new(17,"Quỹ cộng đồng","Chest"),
        new(18,"Tennessee Avenue","Street","Orange",180,100,[14,70,200,550,750,950]),
        new(19,"New York Avenue","Street","Orange",200,100,[16,80,220,600,800,1000]),
        new(20,"Bãi đỗ xe miễn phí","Parking"),
        new(21,"Kentucky Avenue","Street","Red",220,150,[18,90,250,700,875,1050]),
        new(22,"Cơ hội","Chance"),
        new(23,"Indiana Avenue","Street","Red",220,150,[18,90,250,700,875,1050]),
        new(24,"Illinois Avenue","Street","Red",240,150,[20,100,300,750,925,1100]),
        new(25,"B. & O. Railroad","Railroad",Price:200),
        new(26,"Atlantic Avenue","Street","Yellow",260,150,[22,110,330,800,975,1150]),
        new(27,"Ventnor Avenue","Street","Yellow",260,150,[22,110,330,800,975,1150]),
        new(28,"Water Works","Utility",Price:150),
        new(29,"Marvin Gardens","Street","Yellow",280,150,[24,120,360,850,1025,1200]),
        new(30,"Vào tù","GoToJail"),
        new(31,"Pacific Avenue","Street","Green",300,200,[26,130,390,900,1100,1275]),
        new(32,"North Carolina Avenue","Street","Green",300,200,[26,130,390,900,1100,1275]),
        new(33,"Quỹ cộng đồng","Chest"),
        new(34,"Pennsylvania Avenue","Street","Green",320,200,[28,150,450,1000,1200,1400]),
        new(35,"Short Line","Railroad",Price:200),
        new(36,"Cơ hội","Chance"),
        new(37,"Park Place","Street","DarkBlue",350,200,[35,175,500,1100,1300,1500]),
        new(38,"Thuế xa xỉ","Tax",Price:100),
        new(39,"Boardwalk","Street","DarkBlue",400,200,[50,200,600,1400,1700,2000])
    ];
}
