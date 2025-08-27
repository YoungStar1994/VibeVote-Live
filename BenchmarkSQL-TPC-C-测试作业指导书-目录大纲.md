## BenchmarkSQL TPC-C 测试作业指导书（目录大纲）

### 文档范围与读者
- **范围**: 使用 BenchmarkSQL 对各类数据库（单机、分布式）进行 TPC-C 压测的标准作业流程与参数说明。
- **读者**: 性能测试工程师、数据库管理员、研发工程师、SRE。

### 版本与环境前提
- **BenchmarkSQL 版本**: 例如 5.x/6.x（根据实际选择填写）。
- **JDK/运行环境**: JDK 版本、Maven/Gradle 版本、操作系统版本。
- **数据库版本**: PostgreSQL/MySQL/Oracle/分布式数据库（TiDB/OceanBase/PolarDB/自研等）。

## 1. BenchmarkSQL 简介
- **TPC-C 概述**: 业务模型、事务类型与权重、指标定义（TPS/响应时间/百分位）。
- **BenchmarkSQL 组成**: 目录结构、关键模块、运行方式（装载/运行）。
- **兼容性说明**: 原生支持数据库与常见适配点。

## 2. 安装与环境准备
### 2.1 获取与构建
- 获取源码/二进制包（Git 仓库地址、本地构建命令）。
- 依赖安装（JDK、Maven/Gradle、JDBC 驱动）。

### 2.2 目录结构与关键文件
- `run/props.*` 配置文件、`sql.common/`、`sql.*`、`runSQL` 脚本。
- `create-schema`、`load-data`、`runBenchmark` 常用入口。

### 2.3 推荐机器配置
- **压测机（Client）**: CPU/内存/磁盘/网络/NIC、中断亲和、时钟同步。
- **数据库（Server）**: 单机与分布式的 CPU/内存/存储/网络推荐。
- **示例规格**: 小/中/大三档示例，含虚拟化/裸金属差异注意点。

### 2.4 并发与仓数建议
- **单机数据库**: 推荐 `terminals` 与 `warehouses` 区间、CPU 核数映射关系、渐进调参步骤。
- **分布式数据库**: 推荐并发与仓数区间、分片/副本数影响、扩缩容策略。
- **容量评估**: 仓数与数据体量估算、数据与日志盘带宽边界。

### 2.5 数据库准备与权限
- 账号/权限/Schema 规划、连接串与网络白名单、隔离测试环境。

### 2.6 系统与网络前置
- 时钟同步（NTP/Chrony）、内核参数、文件句柄数、网络队列、TCP 参数。

## 3. 测试场景规划
### 3.1 目标与指标
- 业务目标、TPS 与延迟目标、稳态时长、成功率门限。

### 3.2 负载模型与阶段
- 预热（Ramp-up）、稳态（Steady）、收尾（Cool-down）。
- 事务组合权重校验与变体（如只压 New-Order）。

### 3.3 仓数与并发映射
- 仓数与数据量关系、并发与 CPU/IO 映射经验法则。
- 压测梯度设计与停止准则。

## 4. 使用与测试步骤
### 4.1 兼容数据库（PostgreSQL/MySQL/Oracle 等）标准步骤
- 配置 `props.*`：驱动、URL、账号、`warehouses`、`terminals`、`runMins` 等。
- 初始化 Schema：`create-schema`。
- 装载数据：`load-data`（批量/并发装载参数）。
- 执行压测：`runBenchmark`（预热/稳态设置、结果输出目录）。
- 结果收集：日志、事务统计、延迟分布。

### 4.2 非兼容数据库适配指引
- 需要修改的关键文件/位置：
  - `sql.<dialect>/tableCreates.sql`、`indexCreates.sql`、`foreignKeys.sql`、`droptables.sql`。
  - `sql.common/*.sql` 与存储过程/函数相关语句。
  - Java 源码中 SQL 方言差异点（自增/序列、分页、UPSERT、日期/时间函数）。
  - `run/props.*` 中的 JDBC 驱动类名、URL 模式、自动提交/批处理参数。
- 修改要点：
  - 主键/自增/序列、约束与外键开关顺序、事务隔离级别。
  - 批量导入接口（COPY/LOAD DATA/批插）与批大小调整。
  - 语法差异：`MERGE/UPSERT`、`LIMIT/OFFSET`、`CURRENT_TIMESTAMP`、函数命名差异。
- 适配校验：
  - 建表/索引成功、数据装载成功、五类事务可运行、事务比例正确。
  - 小规模自测（1-2 仓、低并发）到中等规模渐进放大。

### 4.3 常见错误与排查
- 连接与权限错误、外键/索引创建失败、数据装载中断。
- 死锁/锁等待、超时、批量失败重试策略。
- 驱动与方言不匹配、编码与时区问题。

## 5. 参数优化指南
### 5.1 BenchmarkSQL 关键运行参数
- `warehouses`、`terminals`、`runMins`、`rampUpMins`、`statusIntervalSec`。
- 事务权重：`newOrderWeight`、`paymentWeight`、`orderStatusWeight`、`deliveryWeight`、`stockLevelWeight`。
- 速率与限流：`limitTxnsPerMin`、思考时间（Think Time）开关与系数。
- 装载参数：`loadWorkers`、`batchSize`、提交频率、并发装载分片。
- 执行细节：是否启用存储过程、JDBC 自动提交、预编译缓存。

### 5.2 数据库与 JDBC 调优参数
- 连接池大小、最大连接数、会话内存、服务器端游标/`fetchSize`。
- 批处理优化（如 MySQL `rewriteBatchedStatements`）、禁用/启用二进制协议。
- 日志级别与慢 SQL 采样频率、检查点/刷盘策略。

### 5.3 并发与仓数选型方法
- 基于 CPU 核数与活跃 Session 的估算方式。
- 基于磁盘/网络带宽的仓数上限估算。
- 梯度压测与二分搜索式调参流程。

### 5.4 结果判读
- 稳态窗口选择、TPS 抖动容忍度、P95/P99 延迟阈值。
- 错误率与超时处理、吞吐与资源利用率的平衡点。

## 6. 资源监控与数据采集
### 6.1 压测机（Client）监控
- CPU（利用率/上下文切换）、内存（使用/GC/交换）、磁盘（IOPS/吞吐/延迟）。
- 网络（带宽/RTT/重传）、文件句柄、进程级指标（`pidstat`）。
- 工具：`sar`、`vmstat`、`iostat`、`mpstat`、`pidstat`、`dstat`、`nmon`、`atop`。

### 6.2 数据库与存储监控
- 实例：连接数、锁等待、缓冲命中率、检查点、后台写入队列。
- SQL 层：QPS/TPS、慢查询、等待事件。
- 存储：阵列/云盘 IOPS、吞吐、队列深度、延迟分布。

### 6.3 网络监控
- 吞吐（bps/pps）、重传率、丢包、时延、突发与队列长度。
- 工具：`ss`/`netstat`、`ifstat`、`nethogs`、`ip -s link`、`tc`。

### 6.4 可观测性方案
- Prometheus + Grafana 仪表盘（压测机/数据库/存储/网络）。
- 采样频率、标签规范、数据留存与导出。

### 6.5 数据留存与审计
- 原始日志、监控时间线、配置版本、Git 记录与测试编号。

## 7. 配置文件参数说明
### 7.1 关键配置文件清单
- `run/props.pg`、`run/props.mysql`、`run/props.oracle`、`run/props.*`（自定义）。
- `sql.common/` 与 `sql.<dialect>/` 下的 DDL/DML 模板。

### 7.2 通用参数字段
- 数据源：`db`、`driver`、`conn`、`user`、`password`、`schema`。
- 负载：`warehouses`、`terminals`、`runMins`、`rampUpMins`、`statusIntervalSec`。
- 权重：`newOrderWeight`、`paymentWeight`、`orderStatusWeight`、`deliveryWeight`、`stockLevelWeight`。
- 行为：思考时间开关、限速 `limitTxnsPerMin`、提交策略、批量设置。
- 输出：日志目录、结果目录、CSV/JSON 导出开关。

### 7.3 各数据库特有参数
- PostgreSQL：`search_path`、`prepareThreshold`、`defaultRowFetchSize` 等。
- MySQL：`rewriteBatchedStatements`、`useServerPrepStmts`、`cachePrepStmts` 等。
- Oracle/其他：驱动类名、方言特性、时区/字符集设置。

### 7.4 示例配置与注释
- 不同规模（小/中/大）示例 `props` 文件片段与注释说明。

## 8. 标准作业流程（SOP）
### 8.1 准备阶段（T-1）
- 需求澄清、环境核对、配置冻结、监控联调、脚本校验。

### 8.2 初始化阶段（T0）
- 建库建表、装载数据、完整性校验、冷/热数据预热策略。

### 8.3 压测阶段（T1）
- 预热、稳态、变更一项/一次（单变量原则）、逐步抬升并发。

### 8.4 收尾与复盘（T2）
- 数据清理、日志打包、监控导出、报告撰写与评审。

## 9. 风险与注意事项
- 数据安全与隔离（避免污染生产）、访问控制与脱敏。
- 资源冲突（并行任务/共享资源）、限流与防护。
- 合规与版权（TPC 规则、第三方依赖许可）。

## 10. FAQ 与故障排除
- 常见报错清单与快速定位步骤、典型修复措施。
- 性能回退场景与对比方法、回归与复现策略。

## 附录
### A. 示例 `props` 文件模板
- 不同数据库与规模的参考模板清单。

### B. 常用脚本与命令
- `create-schema`、`load-data`、`runBenchmark` 典型参数组合。
- 监控采集脚本与统一启动器示例。

### C. 术语表
- TPC-C、W（仓）、TPS、P95/P99、Think Time、Ramp-up、Steady-state 等。

### D. 参考资料
- BenchmarkSQL 项目主页、TPC 官方文档、各数据库驱动与性能调优指南链接。