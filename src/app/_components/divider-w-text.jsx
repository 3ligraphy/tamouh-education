const DividerWText = ({ children }) => {
  return (
    <div className="container flex items-center">
      <div className="border-b-[1px] border-solid border-[#e8b17662] w-full" />
      <span className="content mx-[10px] text-nowrap text-[#e8b176]">
        {children}
      </span>
      <div className="border-b-[1px] border-solid border-[#e8b17662] w-full" />
    </div>
  );
};

export default DividerWText;
