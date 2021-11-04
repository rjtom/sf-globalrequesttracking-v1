function generateguid() {
  function s4() {
    return Math.floor((1 + Math.random()) * 0x10000)
      .toString(16)
      .substring(1);
  }
  return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
    s4() + '-' + s4() + s4() + s4();
}


if (context.getVariable("message.header.x-trace-id") === undefined || context.getVariable("message.header.x-trace-id") === null || context.getVariable("message.header.x-trace-id").length <= 0 )
{
 var guid = generateguid();
 context.setVariable("message.header.x-trace-id", guid);
}