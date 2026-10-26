import type { GameMetadata, InstructionSection } from "../../platform/gameLibraryTypes";

export const monopolyMetadata: GameMetadata = {
  gameKey: "monopoly", title: "CỜ TỈ PHÚ", subtitle: "Mua đất · Xây nhà · Giao dịch",
  description: "Chinh phục bàn cờ classic 40 ô. Thuê đất, đấu giá, xây khách sạn và quản lý tiền mặt để trở thành người cuối cùng còn tài sản.",
  minPlayers: 2, maxPlayers: 6, duration: "60–180 phút", difficulty: "Trung bình", difficultyStars: 3,
  category: ["Kinh tế", "Chiến thuật", "Gia đình"], accent: "default", emblem: "🏦",
};
export const monopolyInstructions: InstructionSection[] = [
  { id: "overview", label: "TỔNG QUAN", kind: "text", paragraphs: [
    "Bản classic Mỹ C1009 (2016/2017), 2–6 người: 40 ô, 28 tài sản. Mỗi người khởi đầu với 1.500; server đổ xúc xắc chọn người đi trước. Qua hoặc đến GO nhận 200.",
    "Thuế thu nhập 200, thuế xa xỉ 100. Bãi đỗ xe miễn phí không trả thưởng. Người cuối cùng chưa phá sản thắng.",
  ] },
  { id: "turn", label: "LƯỢT CHƠI", kind: "text", paragraphs: [
    "Đổ hai xúc xắc, xử lý ô đến rồi kết thúc lượt. Đổ đôi được đi tiếp; ba lần đôi liên tiếp vào tù ngay.",
    "Đến đất trống có thể mua theo giá niêm yết hoặc đưa ra đấu giá từ 10. Mọi người, kể cả người từ chối mua, được tham gia. Đấu giá online lần lượt; bỏ giá là rút khỏi phiên đó.",
    "Công ty dịch vụ tính thuê bằng một lần đổ hai xúc xắc riêng: 4 lần tổng mới nếu chủ có một công ty, 10 lần nếu có cả hai. Không thay kết quả xúc xắc di chuyển hay quyền đi thêm do đổ đôi.",
    "Thẻ Cơ hội và Quỹ cộng đồng được xáo riêng, rút đầu bộ và trả cuối bộ. Thẻ ra tù được giữ đến khi dùng.",
  ] },
  { id: "assets", label: "TÀI SẢN", kind: "text", paragraphs: [
    "Sở hữu trọn nhóm màu để thu gấp đôi tiền thuê đất chưa xây. Xây và bán nhà đều trong nhóm, tối đa 4 nhà rồi đổi thành khách sạn. Ngân hàng có 32 nhà và 12 khách sạn.",
    "Khi kho còn ít, server hỏi nhu cầu thực tế của các chủ đất đủ điều kiện. Đủ cung thì mỗi người xác nhận mua một đơn vị theo giá trên giấy đất. Chỉ khi cầu vượt cung mới đấu giá, người không muốn mua không tham gia. Mỗi phiên đấu giá bán một nhà/khách sạn; muốn mua tiếp có thể gửi yêu cầu xây mới.",
    "Chọn một ô để xem giá, bảng tiền thuê và quản lý tài sản. Phải bán hết nhà cả nhóm trước khi thế chấp hoặc giao dịch đất trong nhóm. Giải chấp trả gốc và 10% lãi.",
    "Có thể đề nghị giao dịch đất, tiền và thẻ ra tù kể cả ngoài lượt. Khi đang nợ, người mắc nợ có thể thương lượng bán tài sản để trả nợ. Bên nhận phải chấp nhận.",
    "Khi nhận đất thế chấp, chọn giải chấp ngay (gốc + 10%) hoặc giữ thế chấp (10% lãi ngay, lần giải chấp sau trả gốc + 10%).",
  ] },
  { id: "jail", label: "TÙ & NỢ", kind: "text", paragraphs: [
    "Trong tù vẫn thu tiền thuê và quản lý tài sản. Trước khi đổ có thể nộp 50 hoặc dùng thẻ ra tù. Đổ đôi được ra tù nhưng không có lượt thêm. Lần thử thứ ba không đôi phải nộp 50 rồi đi theo xúc xắc.",
    "Nếu thiếu tiền trả nợ, bán nhà, thế chấp rồi thanh toán. Chỉ được phá sản khi tổng tiền và giá trị thanh lý không đủ. Tài sản chuyển cho chủ nợ; nợ ngân hàng thì đất được đấu giá lại.",
    "Nhận đất thế chấp từ người phá sản: chủ nợ chọn giữ thế chấp và trả 10% lãi, hoặc giải chấp ngay với gốc + 10%. Nếu thiếu tiền trả lãi bắt buộc, phải xử lý nợ trước khi chơi tiếp.",
    "Mất kết nối lâu: server đổ thay, từ chối mua/giao dịch, bỏ đấu giá, kết thúc lượt và thanh lý để xử lý nợ hiện có.",
  ] },
];
